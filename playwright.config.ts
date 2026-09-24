import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  // 영상·스크린샷·트레이스가 쌓이는 곳 (test-results/<테스트명>/video.webm)
  outputDir: './test-results',

  // 내 주변 추천은 목록 API(7천여 건) + 연출 딜레이 1.5초가 있어 넉넉하게 잡는다
  timeout: 90_000,
  expect: { timeout: 15_000 },

  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],

  use: {
    baseURL: BASE_URL,

    // ── 영상 녹화 ──────────────────────────────────────────────
    // 'on'               : 항상 녹화 (시연·확인용, 지금 설정)
    // 'retain-on-failure': 실패한 테스트만 남기고 나머지는 삭제
    // 'on-first-retry'   : 재시도할 때만 녹화 (CI 용량 절약)
    video: { mode: 'on', size: { width: 1280, height: 720 } },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    // ──────────────────────────────────────────────────────────

    viewport: { width: 1280, height: 720 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',

    // 위치 권한을 미리 허용해 두면 브라우저 권한 팝업 없이 테스트가 돈다.
    // 기본 좌표는 서울 강동구 천호동 (1km 안에 등록 맛집이 있는 지점)
    permissions: ['geolocation'],
    geolocation: { latitude: 37.5368, longitude: 127.1325 },
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // 이미 `npm run dev` 가 떠 있으면 그 서버를 그대로 쓰고, 없으면 띄운다
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
