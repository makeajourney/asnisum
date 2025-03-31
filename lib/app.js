const { App, LogLevel } = require('@slack/bolt');
const orderManager = require('../lib/orderSession');
const menuConfig = require('../lib/menuConfig');
const orderModalView = require('../lib/orderModalView');
const { getTutorialBlocks, errorMessages } = require('../blocks/tutorial');
const { orderMessages } = require('../blocks/orderMessages');
const { getOrderSummaryBlocks } = require('../blocks/orderSummaryBlocks');

// 로깅 함수
const logger = {
  error: (...args) => {
    console.error(new Date().toISOString(), ...args);
  },
  info: (...args) => {
    console.log(new Date().toISOString(), ...args);
  },
};

let app;

// 미리 앱 인스턴스 생성
const getApp = () => {
  if (!app) {
    app = new App({
      token: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      processBeforeResponse: true,
      socketMode: false,
    });

    // 핸들러 설정 전에 토큰 확인
    if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_SIGNING_SECRET) {
      throw new Error('Required Slack credentials are missing');
    }

    // 명령어 핸들러들을 설정
    setupHandlers(app);
  }
  return app;
};

function createOrderModal(trigger_id, channel_id) {
  return {
    trigger_id,
    view: orderModalView(channel_id),
  };
}

// 주문 텍스트 생성 공통 함수
function formatOrderText(orderData, includeUserId = true) {
  const { userId, menu, temperature, beanOption, extraOptions, options } =
    orderData;

  const orderParts = [];

  if (includeUserId && userId) {
    orderParts.push(`<@${userId}>`);
  }

  orderParts.push(temperature === 'hot' ? '따뜻한' : '아이스');

  orderParts.push(menu);

  if (beanOption) {
    const beanOptionText =
      menuConfig.beanOptions.find((b) => b.value === beanOption)?.text ||
      '다크(기본)';
    orderParts.push(beanOptionText);
  }

  if (extraOptions && extraOptions.length > 0) {
    const extraOptionsText = extraOptions
      .map(
        (optValue) =>
          menuConfig.extraOptions.find((o) => o.value === optValue)?.text
      )
      .filter(Boolean)
      .join('+');
    if (extraOptionsText) {
      orderParts.push(extraOptionsText);
    }
  }

  if (options) {
    orderParts.push(`(${options})`);
  }

  return orderParts.join(' ');
}

function createOrderText(orderData) {
  return formatOrderText(orderData, true);
}

function createMenuSummaryText(orderData) {
  return formatOrderText(orderData, false);
}

// 주문하기 버튼 클릭 핸들러
async function handleOrderButton({ body, client, respond }) {
  logger.info('Order button clicked:', { body });

  try {
    const isActive = await orderManager.isActiveSession(body.channel.id);

    if (!isActive) {
      await respond({
        text: errorMessages.noActiveSession,
        response_type: 'ephemeral',
      });
      return;
    }

    logger.info('Opening modal with trigger_id:', body.trigger_id);
    const result = await client.views.open(
      createOrderModal(body.trigger_id, body.channel.id)
    );
    logger.info('Modal opened successfully:', result);
  } catch (error) {
    logger.error('모달 열기 실패:', error);
    await respond({
      text: '주문 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      response_type: 'ephemeral',
    });
  }
}

// 주문 제출 핸들러
async function handleOrderSubmission({ body, view, client }) {
  try {
    const channelId = view.private_metadata;
    const session = await orderManager.getSession(channelId);

    if (!session || !(await orderManager.isActiveSession(channelId))) {
      logger.error('주문 세션이 유효하지 않습니다');
      return {
        response_action: 'errors',
        errors: {
          menu: '주문 세션이 만료되었습니다. 새로운 주문을 시작해주세요.',
        },
      };
    }

    // 선택된 메뉴 정보 가져오기
    const selectedMenu =
      view.state.values.menu.menu_input.selected_option.value;

    // 메뉴 정보 찾기
    const menuItem = menuConfig.menus.find((m) => m.value === selectedMenu);

    // 커피 메뉴인지 확인
    const isCoffeeMenu =
      menuItem &&
      menuConfig.categoriesNeedingBeanOption.includes(menuItem.category);

    // 원두 옵션 (커피 메뉴일 때만 기본값 설정)
    const beanOptionSelection =
      view.state.values.bean_option.bean_option_input.selected_option;
    const beanOption = isCoffeeMenu
      ? beanOptionSelection?.value || 'dark' // 커피 메뉴면 기본값 'dark'
      : beanOptionSelection?.value || null; // 커피 메뉴가 아니면 null

    const orderData = {
      userId: body.user.id,
      menu: selectedMenu,
      temperature:
        view.state.values.temperature.temperature_input.selected_option.value,
      beanOption: beanOption,
      extraOptions: (
        view.state.values.extra_options.extra_options_input.selected_options ||
        []
      ).map((opt) => opt.value),
      options: view.state.values.options.options_input.value,
    };

    const orderText = createOrderText(orderData);

    // 스레드에 주문 내용 추가
    await client.chat.postMessage({
      channel: channelId,
      thread_ts: session.messageTs,
      text: orderText,
    });

    // 주문 데이터 저장
    await orderManager.addOrder(channelId, orderData);
  } catch (error) {
    logger.error('Order submission error:', error);
    return {
      response_action: 'errors',
      errors: {
        menu: '주문 처리 중 오류가 발생했습니다. 다시 시도해주세요.',
      },
    };
  }
}

async function handleOrderStart({ command, client, respond }) {
  // 이미 진행 중인 주문이 있는지 확인
  const isActive = await orderManager.isActiveSession(command.channel_id);

  logger.info('Active session check:', {
    isActive,
    channelId: command.channel_id,
  });

  if (isActive) {
    await respond({
      text: errorMessages.activeSession,
      response_type: 'ephemeral',
    });
    return;
  }

  // 명령어에서 사용자 그룹 ID 추출
  const args = command.text.split(' ');
  const userGroupId = args[1]?.startsWith('<!subteam^')
    ? args[1].match(/<!subteam\^([^|]+)/)?.[1]
    : null;

  const messageConfig = userGroupId
    ? {
        text: orderMessages.withUserGroup.text(userGroupId),
        blocks: orderMessages.withUserGroup.blocks(userGroupId),
      }
    : orderMessages.start;

  logger.info('Sending initial message');
  const result = await client.chat.postMessage({
    channel: command.channel_id,
    ...messageConfig,
  });

  // 주문현황 기능 안내 메시지
  await client.chat.postMessage({
    channel: command.channel_id,
    thread_ts: result.ts,
    ...orderMessages.status,
  });

  logger.info('Message sent successfully:', result);

  // 새 세션 시작
  await orderManager.startSession(
    command.channel_id,
    result.ts,
    command.user_id
  );
  logger.info('New session started');
}

// 주문 현황 처리 함수
async function handleOrderStatus({ command, client, respond }) {
  const session = await orderManager.getSession(command.channel_id);

  if (!session || !(await orderManager.isActiveSession(command.channel_id))) {
    await respond({
      text: errorMessages.noActiveSession,
      response_type: 'ephemeral',
    });
    return;
  }

  if (session.orders.length === 0) {
    await respond({
      text: '아직 접수된 주문이 없습니다.',
      response_type: 'ephemeral',
    });
    return;
  }

  const menuGroups = {};

  for (const order of session.orders) {
    // 메뉴명만 추출 (정렬에 사용)
    const menuName = order.menu;

    // 메뉴 표시 텍스트 생성
    const menuDisplayText = createMenuSummaryText(order);

    if (!menuGroups[menuName]) {
      menuGroups[menuName] = {};
    }

    if (!menuGroups[menuName][menuDisplayText]) {
      menuGroups[menuName][menuDisplayText] = 0;
    }

    menuGroups[menuName][menuDisplayText]++;
  }

  const sortedMenuNames = Object.keys(menuGroups).sort((a, b) =>
    a.localeCompare(b, 'ko')
  );

  const sortedMenuItems = [];
  for (const menuName of sortedMenuNames) {
    for (const [displayText, count] of Object.entries(menuGroups[menuName])) {
      sortedMenuItems.push([displayText, count]);
    }
  }

  let summary = '*현재 주문 현황*\n';
  summary += `총 ${session.orders.length}건의 주문이 있습니다.\n\n`;

  for (const [menuText, count] of sortedMenuItems) {
    summary += `• ${menuText} (${count}건)\n`;
  }

  const summaryBlocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: summary,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '주문 마감하기',
            emoji: true,
          },
          style: 'primary',
          action_id: 'end_order_button',
        },
      ],
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: '💡 버튼을 클릭하거나 `/아즈니섬 주문마감` 명령어로 주문을 마감할 수 있습니다.',
        },
      ],
    },
  ];

  await client.chat.postMessage({
    channel: command.channel_id,
    thread_ts: session.messageTs,
    blocks: summaryBlocks,
    text: '현재 주문 현황입니다.', // fallback text
  });
}

// 핸들러 설정 함수
const setupHandlers = (app) => {
  const commandName =
    process.env.VERCEL_ENV === 'production' ? '/아즈니섬' : '/dev아즈니섬';

  // 주문마감 명령어 처리
  async function handleOrderEnd({ command, client, respond }) {
    const session = await orderManager.getSession(command.channel_id);

    if (!session || !(await orderManager.isActiveSession(command.channel_id))) {
      await respond({
        text: '현재 진행 중인 주문이 없습니다.',
        response_type: 'ephemeral',
      });
      return;
    }

    if (session.orders.length === 0) {
      await respond({
        text: errorMessages.noOrders,
        response_type: 'in_channel',
      });
      await orderManager.clearSession(command.channel_id);
      return;
    }

    // 주문 내역 정리
    let summary = '*주문 내역 정리*\n';
    summary += `총 ${session.orders.length}건의 주문이 있습니다.\n\n`;

    for (const order of session.orders) {
      summary += createOrderText(order) + '\n';
    }

    // 스레드에 정리 내용 추가
    await client.chat.postMessage({
      channel: command.channel_id,
      thread_ts: session.messageTs,
      text: summary,
    });

    // 특정 채널에 요약 전송
    const orderSummaryChannel = 'C08KAQPLBHN'; // 주문 내역을 전송할 채널 ID

    try {
      // 주문 요약을 위한 집계
      const orderSummary = session.orders.reduce((acc, order) => {
        const key = [
          order.menu,
          order.temperature,
          order.beanOption,
          (order.extraOptions || []).sort().join('+'),
          order.options,
        ]
          .filter(Boolean)
          .join(' | ');

        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      // 메뉴 기준으로 정렬
      const sortedOrders = Object.entries(orderSummary).sort(
        ([orderA], [orderB]) => {
          // 메뉴명 추출 (첫 번째 | 이전까지의 텍스트)
          const menuA = orderA.split(' | ')[0];
          const menuB = orderB.split(' | ')[0];
          return menuA.localeCompare(menuB, 'ko');
        }
      );
      // 원본 채널 정보 가져오기
      const channelInfo = await client.conversations.info({
        channel: command.channel_id,
      });

      const sourceChannelName = channelInfo.channel.name;

      // 주문 마감을 요청한 사용자 정보 가져오기
      const userId = command.user_id;
      let username = userId;
      try {
        const userInfo = await client.users.info({ user: userId });
        username = userInfo.user.real_name || userInfo.user.name;
      } catch (userError) {
        logger.error('사용자 정보 가져오기 실패:', userError);
        // 사용자 정보를 가져오지 못해도 진행
      }

      // 주문현황 형식과 동일한 블록 구성으로 요약 전송
      await client.chat.postMessage({
        channel: orderSummaryChannel,
        text: `📋 *${sourceChannelName} 채널의 아즈니섬 주문 내역*`,
        blocks: getOrderSummaryBlocks(
          command.channel_id,
          sourceChannelName,
          session.startedByUserId,
          session.orders,
          sortedOrders
        ),
      });

      logger.info('주문 내역 요약이 지정 채널로 전송되었습니다.');
    } catch (error) {
      logger.error('주문 내역 전송 오류:', error);
      // 주문 마감은 계속 진행하고, 전송 오류만 로그에 기록
    }

    // 세션 종료 및 삭제
    await orderManager.clearSession(command.channel_id);

    await respond({
      text: '주문이 마감되었습니다.',
      response_type: 'in_channel',
    });
  }

  // 도움말 명령어 처리
  async function handleHelp({ command, respond }) {
    await respond({
      blocks: getTutorialBlocks(),
      text: '🍵 아즈니섬 주문봇 사용 가이드입니다.',
      response_type: 'ephemeral',
    });
    logger.info('Help message sent successfully');
  }

  // 메인 command 핸들러
  app.command(commandName, async ({ command, client, respond }) => {
    // 주문시작 명령어에 대해서는 전체 텍스트가 아닌 첫 단어만 체크
    const subcommand = command.text.split(' ')[0].trim().toLowerCase();

    logger.info(`${process.env.VERCEL_ENV} 환경에서 명령어 실행:`, {
      command: commandName,
      subcommand,
    });

    try {
      switch (subcommand) {
        case '주문시작':
        case '주문':
        case '주문하기':
          await handleOrderStart({ command, client, respond });
          break;

        case '주문현황':
          await handleOrderStatus({ command, client, respond });
          break;

        case '주문마감':
          await handleOrderEnd({ command, client, respond });
          break;

        case '도움말':
          await handleHelp({ command, respond });
          break;

        default:
          await respond({
            text: '알 수 없는 명령어입니다. `/아즈니섬 도움말`을 입력하여 사용 가능한 명령어를 확인하세요.',
            response_type: 'ephemeral',
          });
      }
    } catch (error) {
      logger.error('Command handler error:', {
        error: error.message,
        stack: error.stack,
        command,
        subcommand,
      });

      if (error.message.includes('channel_not_found')) {
        await respond({
          text: errorMessages.channelNotFound,
          response_type: 'ephemeral',
        });
      } else {
        await respond({
          text: `명령어 처리 중 오류가 발생했습니다. (${error.message})`,
          response_type: 'ephemeral',
        });
      }
    }
  });

  async function handleEndOrderButton({ body, ack, client }) {
    await handleOrderEnd({
      command: {
        channel_id: body.channel.id,
      },
      client,
      respond: async (message) => {
        if (message.response_type === 'ephemeral') {
          await client.chat.postEphemeral({
            channel: body.channel.id,
            user: body.user.id,
            text: message.text,
          });
        } else {
          await client.chat.postMessage({
            channel: body.channel.id,
            text: message.text,
          });
        }
      },
    });
  }

  // 주문현황 버튼 핸들러
  async function handleStatusButton({ body, ack, client }) {
    await handleOrderStatus({
      command: {
        channel_id: body.channel.id,
      },
      client,
      respond: async (message) => {
        if (message.response_type === 'ephemeral') {
          await client.chat.postEphemeral({
            channel: body.channel.id,
            user: body.user.id,
            text: message.text,
          });
        } else {
          await client.chat.postMessage({
            channel: body.channel.id,
            text: message.text,
          });
        }
      },
    });
  }

  // 주문하기 버튼 액션
  app.action('order_button', handleOrderButton);

  // 주문현황 버튼 액션
  app.action('check_status_button', handleStatusButton);

  // 주문 마감 버튼 액션
  app.action('end_order_button', handleEndOrderButton);

  // 주문 제출 처리
  app.view('order_submission', handleOrderSubmission);
};

module.exports = {
  getApp,
  handleOrderStart,
  logger,
};
