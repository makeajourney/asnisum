const menuConfig = require('./menuConfig');

const orderModalView = (channel_id) => ({
  type: 'modal',
  callback_id: 'order_submission',
  title: {
    type: 'plain_text',
    text: '아즈니섬 주문하기',
  },
  submit: {
    type: 'plain_text',
    text: '주문',
  },
  blocks: [
    {
      type: 'input',
      block_id: 'menu',
      element: {
        type: 'static_select',
        action_id: 'menu_input',
        placeholder: {
          type: 'plain_text',
          text: '메뉴를 선택해주세요',
        },
        options: menuConfig.menus
          .sort((a, b) => {
            // 카테고리 우선순위 정의
            const categoryOrder = { coffee: 1, tea: 2, ade: 3, bottle: 4 };
            const aPriority = categoryOrder[a.category] || 999;
            const bPriority = categoryOrder[b.category] || 999;
            
            if (aPriority !== bPriority) {
              return aPriority - bPriority;
            }
            // 같은 카테고리 내에서는 한글 이름순 정렬
            return a.text.localeCompare(b.text, 'ko');
          })
          .map((menu) => ({
            text: { type: 'plain_text', text: menu.text },
            value: menu.value,
          })),
      },
      label: {
        type: 'plain_text',
        text: '메뉴',
      },
    },
    {
      type: 'input',
      block_id: 'temperature',
      element: {
        type: 'radio_buttons',
        action_id: 'temperature_input',
        options: menuConfig.temperatureOptions.map((temp) => ({
          text: { type: 'plain_text', text: temp.text },
          value: temp.value,
        })),
      },
      label: {
        type: 'plain_text',
        text: '온도',
      },
    },
    {
      type: 'input',
      block_id: 'bean_option',
      element: {
        type: 'radio_buttons',
        action_id: 'bean_option_input',
        options: menuConfig.beanOptions.map((bean) => ({
          text: { type: 'plain_text', text: bean.text },
          value: bean.value,
        })),
      },
      label: {
        type: 'plain_text',
        text: '원두 옵션',
      },
      optional: true,
    },
    {
      type: 'input',
      block_id: 'extra_options',
      element: {
        type: 'checkboxes',
        action_id: 'extra_options_input',
        options: menuConfig.extraOptions.map((option) => ({
          text: { type: 'plain_text', text: option.text },
          value: option.value,
        })),
      },
      label: {
        type: 'plain_text',
        text: '기타 옵션',
      },
      optional: true,
    },
    {
      type: 'input',
      block_id: 'options',
      element: {
        type: 'plain_text_input',
        action_id: 'options_input',
        multiline: true,
      },
      label: {
        type: 'plain_text',
        text: '추가 요청사항',
      },
      optional: true,
    },
  ],
  private_metadata: channel_id,
});

module.exports = orderModalView;