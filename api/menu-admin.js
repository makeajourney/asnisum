export default async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(req, res) {
  try {
    const menuConfig = require('../lib/menuConfig');
    const path = require('path');
    const fs = require('fs');
    
    // HTML 템플릿 파일 읽기
    const htmlPath = path.join(process.cwd(), 'public', 'menu-admin.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    // 메뉴 데이터를 템플릿에 주입
    html = html.replace('{{MENU_DATA}}', JSON.stringify(menuConfig));
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (error) {
    console.error('HTML 파일 읽기 오류:', error);
    res.status(500).json({ error: 'HTML 파일을 불러올 수 없습니다.' });
  }
}

async function handlePost(req, res) {
  const { action, menuData, password } = req.body;

  // 환경변수에서 관리자 비밀번호 확인
  const adminPassword = process.env.MENU_ADMIN_PASSWORD;
  if (!adminPassword) {
    return res.status(500).json({ error: '서버 설정 오류: 관리자 비밀번호가 설정되지 않았습니다.' });
  }

  if (password !== adminPassword) {
    return res.status(401).json({ error: '인증 실패' });
  }

  if (action === 'auth') {
    // 인증만 확인하고 성공 응답
    return res.status(200).json({ success: true, message: '인증 성공' });
  } else if (action === 'save') {
    try {
      await updateMenuConfig(menuData);
      res.status(200).json({ success: true, message: '메뉴가 저장되었습니다.' });
    } catch (error) {
      console.error('Menu save error:', error);
      res.status(500).json({ error: '메뉴 저장 중 오류가 발생했습니다: ' + error.message });
    }
  } else {
    res.status(400).json({ error: '잘못된 액션입니다.' });
  }
}

async function updateMenuConfig(menuData) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN 환경변수가 설정되지 않았습니다.');
  }

  const owner = 'makeajourney';
  const repo = 'asnisum';
  const path = 'lib/menuConfig.js';

  // 새로운 파일 내용 생성
  const newContent = generateMenuConfigFile(menuData);
  const encodedContent = Buffer.from(newContent).toString('base64');

  // 현재 파일의 SHA 가져오기
  const getFileResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!getFileResponse.ok) {
    throw new Error('파일 정보를 가져올 수 없습니다.');
  }

  const fileData = await getFileResponse.json();
  const sha = fileData.sha;

  // 파일 업데이트
  const updateResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: '메뉴 설정 업데이트 via 웹 관리자',
      content: encodedContent,
      sha: sha,
    }),
  });

  if (!updateResponse.ok) {
    const errorData = await updateResponse.json();
    throw new Error(`GitHub API 오류: ${errorData.message}`);
  }

  return await updateResponse.json();
}

function generateMenuConfigFile(menuData) {
  return `const menuConfig = {
  // 메뉴 목록
  menus: [
${menuData.menus.map(menu => `    {
      text: '${menu.text}',
      value: '${menu.value}',
      category: '${menu.category}',
    }`).join(',\n')}
  ],

  // 원두 옵션
  beanOptions: [
${menuData.beanOptions.map(option => `    {
      text: '${option.text}',
      value: '${option.value}',
    }`).join(',\n')}
  ],

  // 온도 옵션
  temperatureOptions: [
${menuData.temperatureOptions.map(option => `    {
      text: '${option.text}',
      value: '${option.value}',
    }`).join(',\n')}
  ],

  // 추가 옵션
  extraOptions: [
${menuData.extraOptions.map(option => `    {
      text: '${option.text}',
      value: '${option.value}',
    }`).join(',\n')}
  ],

  // 원두 옵션이 필요한 카테고리
  categoriesNeedingBeanOption: ${JSON.stringify(menuData.categoriesNeedingBeanOption || ['coffee'])},
};

module.exports = menuConfig;
`;
}