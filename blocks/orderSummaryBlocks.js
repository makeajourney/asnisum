// blocks/orderSummaryBlocks.js
const getOrderSummaryBlocks = (
  sourceChannelId,
  sourceChannelName,
  startedByUserId,
  orders,
  sortedOrders
) => [
  {
    type: 'header',
    text: {
      type: 'plain_text',
      text: `📋 아즈니섬 주문 내역`,
      emoji: true,
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*주문 채널:* <#${sourceChannelId}|${sourceChannelName}>\n*주문자:* <@${startedByUserId}>`,
    },
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*현재 주문 현황*\n총 ${orders.length}건의 주문이 있습니다.\n\n${sortedOrders
        .map(([orderKey, count]) => `• ${orderKey} (${count}건)`)
        .join('\n')}`,
    },
  },
  {
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `${new Date().toLocaleString('ko-KR')} 주문 마감 | 총 ${orders.length}건`,
      },
    ],
  },
];

module.exports = {
  getOrderSummaryBlocks,
};
