/**
 * 아산시 스마트시티 예산관리 대시보드 설정
 * 
 * 이 파일은 GitHub Actions에 의해 자동으로 업데이트됩니다.
 * 수동 수정 시 다음 동기화 때 덮어씌워질 수 있습니다.
 * 
 * 데이터 흐름:
 *   Slack #플랜예산 → Google Sheets → Notion DB → GitHub Actions → 이 파일
 * 
 * 마지막 자동 업데이트: GitHub Actions에서 관리
 */

const NOTION_CONFIG = {
    // ============================================
    // 프로젝트 기본 정보
    // ============================================
    project: {
        name: '아산시 강소형 스마트시티 조성사업',
        period: '2023 ~ 2025.12.31',
        location: '충청남도 아산시 도고면·배방읍 일원',
        totalBudget: 24000000000,  // 240억원
        fundingSources: {
            national: 12000000000,  // 국비 120억
            provincial: 6000000000, // 도비 60억
            municipal: 6000000000   // 시비 60억
        }
    },

    // ============================================
    // 실시간 현황 (GitHub Actions 자동 업데이트)
    // ============================================
    currentStatus: {
        updateDate: '2025-01-05',
        allocatedBudget: 24000000000,    // 배정예산
        executedAmount: 10282464177,     // 집행금액
        executionRate: 42.8,             // 집행률 (%)
        remainingBudget: 13717535823,    // 잔액
        daysRemaining: 360               // 남은 일수 (D-day)
    },

    // ============================================
    // Notion 연동 정보
    // ============================================
    notion: {
        projectPage: 'https://www.notion.so/21650aa9577d80dc8278e0187c54677f',
        budgetDatabase: 'https://www.notion.so/54bfedc3769e43e8bdbcd59f22008417',
        wbsDatabase: 'https://www.notion.so/2a250aa9577d80ca8bf2f2abfce71a59',
        assetDatabase: 'https://www.notion.so/2b750aa9577d8170b77ee4cab8d09d2f'
    },

    // ============================================
    // 데이터 소스 정보
    // ============================================
    dataSources: {
        googleSheets: {
            id: '1w9IwMI8B96AfdUDe31SfByOy67oYzvjv',
            url: 'https://docs.google.com/spreadsheets/d/1w9IwMI8B96AfdUDe31SfByOy67oYzvjv/',
            slackChannel: '#플랜예산'
        },
        github: {
            repo: 'LEESUNGHO-AI/Asan-Smart-City-Budget-Management-System-BMS-',
            dashboardUrl: 'https://leesungho-ai.github.io/Asan-Smart-City-Budget-Management-System-BMS-/'
        }
    },

    // ============================================
    // 단위사업별 현황
    // ============================================
    projectStatus: {
        '유무선네트워크': { progress: 96.2, status: 'complete', budget: 400000000 },
        '이노베이션센터': { progress: 93.4, status: 'complete', budget: 1300000000 },
        'SDDC_Platform': { progress: 28.9, status: 'in_progress', budget: 2700000000 },
        '디지털OASIS_SPOT': { progress: 0.4, status: 'warning', budget: 3500000000 },
        '스마트공공WiFi': { progress: 0, status: 'pending', budget: 735000000 },
        'AI통합관제': { progress: 0, status: 'pending', budget: 1600000000 }
    },

    // ============================================
    // 비목별 현황
    // ============================================
    categoryStatus: {
        '인건비': { budget: 1901500000, executed: 1784334539, rate: 93.8 },
        '운영비': { budget: 753400000, executed: 436495832, rate: 57.9 },
        '여비': { budget: 40100000, executed: 72545332, rate: 180.9 },
        '연구개발비': { budget: 1000000000, executed: 0, rate: 0 },
        '유형자산': { budget: 20000000, executed: 16484942, rate: 82.4 },
        '무형자산': { budget: 9050000000, executed: 4207500000, rate: 46.5 },
        '건설비': { budget: 9935000000, executed: 2465103532, rate: 24.8 },
        '사업비배분': { budget: 1300000000, executed: 1300000000, rate: 100.0 }
    },

    // ============================================
    // 리스크 현황
    // ============================================
    risks: {
        critical: [
            { item: '디지털OASIS SPOT', issue: '집행률 0.4%', action: '긴급 발주 필요' },
            { item: '국내여비', issue: '예산 초과 180.9%', action: '예산 조정 필요' }
        ],
        high: [
            { item: 'SDDC Platform', issue: '계약 협상 중', action: '12월 내 체결 목표' },
            { item: '부스제작비', issue: '예산 초과 191.8%', action: '추가 예산 확보' }
        ],
        medium: [
            { item: '스마트공공WiFi', issue: '미집행', action: '발주 준비 중' },
            { item: '무인매장', issue: '미집행', action: '업체 선정 필요' }
        ]
    },

    // ============================================
    // 연락처
    // ============================================
    contacts: {
        pmo: {
            team: 'PMO팀',
            email: 'smartcity-pmo@cheileng.com',
            phone: '02-3450-7200'
        },
        city: {
            team: '아산시 스마트도시팀',
            phone: '041-540-2850'
        }
    }
};

// 유틸리티 함수
const BudgetUtils = {
    formatCurrency: (value) => {
        if (value >= 100000000) {
            return (value / 100000000).toFixed(1) + '억원';
        } else if (value >= 10000) {
            return (value / 10000).toFixed(0) + '만원';
        }
        return value.toLocaleString() + '원';
    },

    formatPercent: (value) => {
        return value.toFixed(1) + '%';
    },

    getStatusColor: (rate) => {
        if (rate >= 80) return '#10B981';  // green
        if (rate >= 50) return '#F59E0B';  // yellow
        if (rate > 0) return '#EF4444';    // red
        return '#6B7280';                   // gray
    },

    getDaysRemainingText: () => {
        const endDate = new Date('2025-12-31');
        const today = new Date();
        const diff = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        return diff > 0 ? `D-${diff}` : '종료';
    }
};

// 전역 노출
if (typeof window !== 'undefined') {
    window.NOTION_CONFIG = NOTION_CONFIG;
    window.BudgetUtils = BudgetUtils;
}

// Node.js 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NOTION_CONFIG, BudgetUtils };
}
