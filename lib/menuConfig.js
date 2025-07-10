const menuConfig = {
  // 메뉴 목록
  menus: [
    {
      text: '아메리카노',
      value: 'americano',
      category: 'coffee',
    },
    {
      text: '카페 라떼',
      value: 'caffe-latte',
      category: 'coffee',
    },
    {
      text: '바닐라 빈 라떼',
      value: 'vanilla-bean-latte',
      category: 'coffee',
    },
    {
      text: '아이스티',
      value: 'ice-tea',
      category: 'ade',
    },
    {
      text: '밀크 티',
      value: 'milk-tea',
      category: 'ade',
    },
    {
      text: '쇼콜라 라떼',
      value: 'chocolate-latte',
      category: 'ade',
    },
    {
      text: '자몽에이드',
      value: '자몽에이드',
      category: 'ade',
    },
    {
      text: '레몬에이드',
      value: 'lemon-ade',
      category: 'ade',
    },
    {
      text: '체리에이드',
      value: 'cherry-ade',
      category: 'ade',
    },
    {
      text: '감잎차',
      value: 'persimmon-leaf-tea',
      category: 'tea',
    },
    {
      text: '호박차',
      value: 'pumpkin-tea',
      category: 'tea',
    },
    {
      text: '분다버그 진저비어',
      value: 'bundaberg-gingerbeer',
      category: 'bottle',
    },
    {
      text: '분다버그 레몬',
      value: 'bundaberg-lemon',
      category: 'bottle',
    },
    {
      text: '분다버그 자몽',
      value: 'bundaberg-grapefruit',
      category: 'bottle',
    },
    {
      text: '골드메달 애플주스',
      value: 'apple-juice',
      category: 'bottle',
    },
    {
      text: '에스프레소',
      value: 'espresso',
      category: 'coffee',
    },
    {
      text: '드링킹요거트 라떼',
      value: 'drinking-yogurt',
      category: 'ade',
    },
    {
      text: '레몬차',
      value: 'lemon-tea',
      category: 'ade',
    },
    {
      text: '쑥차',
      value: 'mugwor-tea',
      category: 'tea',
    },
    {
      text: '호지차',
      value: 'roasted-green-tea',
      category: 'tea',
    }
  ],

  // 원두 옵션
  beanOptions: [
    {
      text: '다크(기본)',
      value: 'dark',
    },
    {
      text: '산미',
      value: 'acid',
    },
    {
      text: '디카페인',
      value: 'decaf',
    }
  ],

  // 온도 옵션
  temperatureOptions: [
    {
      text: 'HOT',
      value: 'hot',
    },
    {
      text: 'ICE',
      value: 'ice',
    }
  ],

  // 추가 옵션
  extraOptions: [
    {
      text: '샷 추가',
      value: 'extra_shot',
    },
    {
      text: '연하게',
      value: 'light',
    },
    {
      text: '덜 달게',
      value: 'less_sweet',
    },
    {
      text: '얼음 적게',
      value: 'less_ice',
    }
  ],

  // 원두 옵션이 필요한 카테고리
  categoriesNeedingBeanOption: ["coffee"],
};

module.exports = menuConfig;
