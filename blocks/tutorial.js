const getTutorialBlocks = () => [
  {
    type: 'header',
    text: {
      type: 'plain_text',
      text: '🍵 아즈니섬 주문봇 사용 가이드',
      emoji: true,
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '*시작하기*\n한 채널당 하나의 주문만 유효합니다. 기존 주문을 완료하고 `/아즈니섬 주문시작` 명령어를 사용해 새로운 주문을 시작하세요.',
    },
  },
  {
    type: 'divider',
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '*사용 가능한 명령어*',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '• `/아즈니섬 주문시작` (또는 `/아즈니섬 주문`, `/아즈니섬 주문하기`)\n   새로운 주문 세션을 시작합니다\n   💡 사용자 그룹 멘션과 함께 시작할 수도 있습니다 (예: `/아즈니섬 주문시작 @그룹명`)\n\n• `/아즈니섬 주문현황`\n   현재까지 주문된 메뉴 현황을 보여줍니다\n\n• `/아즈니섬 주문마감`\n   현재 진행 중인 주문을 마감하고 주문 내역을 보여줍니다\n\n• `/아즈니섬 도움말`\n   이 도움말을 보여줍니다',
    },
  },
  {
    type: 'divider',
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '*주문 과정 예시*',
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: "1️⃣ `/아즈니섬 주문시작` 명령어로 주문 세션을 시작합니다\n2️⃣ '주문하기' 버튼을 클릭하여 메뉴를 입력합니다\n3️⃣ 모든 주문이 완료되면 `/아즈니섬 주문마감` 명령어로 주문을 마감합니다",
    },
  },
  {
    type: 'divider',
  },
  {
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: '💁 사용문의: <@U032432TM0Q>\n📌 이슈 등록: <https://github.com/makeajourney/asnisum-order-for-slack/issues|GitHub>\n📖 메뉴 설정 가이드: <https://github.com/makeajourney/asnisum-order-for-slack?tab=readme-ov-file#메뉴-설정-가이드|가이드 보기>',
      },
    ],
  },
];

const errorMessages = {
  activeSession:
    '이미 진행 중인 주문이 있습니다. 먼저 `/아즈니섬 주문마감` 명령어로 현재 주문을 마감해주세요.',
  noActiveSession:
    '현재 진행 중인 주문이 없습니다. `/아즈니섬 주문시작` 명령어로 새로운 주문을 시작해주세요.',
  noOrders: '접수된 주문이 없습니다. 주문 세션을 종료합니다.',
  invalidSession: '주문 세션이 유효하지 않습니다.',
  modalError: '주문 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
};

module.exports = {
  getTutorialBlocks,
  errorMessages,
};
