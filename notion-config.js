// Notion API 연동 설정
// 이 파일은 GitHub Pages에서 노션 데이터를 가져오기 위한 설정입니다.

const NOTION_CONFIG = {
    // 노션 데이터베이스 ID
    databases: {
        budgetManagement: '2aa50aa9-577d-8128-b6d4-c5c21d845796',  // 예산관리 시스템
        wbsManagement: 'd9396e10-b13c-4469-9086-3322af5a2659',      // WBS 관리 시스템
        riskManagement: '199f2378-aab3-437c-937e-3209b93021bd',     // 리스크 관리 시스템
        assetManagement: '2aa50aa9-577d-8125-8cf7-cb3988aad68e'     // 자산관리 시스템
    },
    
    // 노션 페이지 ID
    pages: {
        projectManagement: '21650aa9-577d-80dc-8278-e0187c54677f',  // 프로젝트 관리 메인
        dashboard: '2aa50aa9-577d-817d-a233-c79ce0c441fe',          // 통합 대시보드
        budgetReport: '25d50aa9-577d-81d7-bd29-c4dff6691d65'        // 종합현황 보고서
    },
    
    // 프로젝트 기본 정보
    project: {
        name: '아산시 강소형 스마트시티 조성사업',
        totalBudget: 24000000000,  // 240억원
        nationalFund: 12000000000, // 국비 120억원
        localFund: 12000000000,    // 지방비 120억원
        startDate: '2023-01-01',
        endDate: '2025-12-31',
        location: '충청남도 아산시 도고면·배방읍 일원'
    },
    
    // 현재 예산 현황 (2025-11-27 기준)
    currentStatus: {
        updateDate: '2025-11-27',
        allocatedBudget: 17134000000,    // 배정예산 171.34억원
        contractAmount: 3358000000,       // 계약금액 33.58억원
        executedAmount: 2530000000,       // 집행금액 25.3억원
        executionRate: 14.8,              // 집행률 14.8%
        remainingBudget: 14604000000,     // 잔액 146.04억원
        daysRemaining: 34                  // 남은 기간
    },
    
    // 재원별 집행 현황
    fundExecution: {
        national: {
            allocated: 8570000000,    // 85.7억원
            executed: 1270000000,     // 12.7억원
            rate: 10.6
        },
        provincial: {
            allocated: 2060000000,    // 20.6억원
            executed: 300000000,      // 3.0억원
            rate: 10.4
        },
        municipal: {
            allocated: 6500000000,    // 65.0억원
            executed: 960000000,      // 9.6억원
            rate: 10.5
        }
    },
    
    // 핵심 사업 목록
    coreProjects: [
        {
            id: 'sddc-platform',
            name: 'SDDC Platform 구축',
            budget: 2700000000,
            status: 'bidding',
            progress: 0,
            manager: '이성호',
            priority: 'urgent',
            deadline: '2025-12-05'
        },
        {
            id: 'digital-oasis-info',
            name: '디지털OASIS 정보관리',
            budget: 2300000000,
            status: 'selection',
            progress: 0,
            manager: '임혁',
            priority: 'urgent',
            deadline: '2025-12-08'
        },
        {
            id: 'ai-control',
            name: 'AI통합관제 플랫폼',
            budget: 1600000000,
            status: 'contracting',
            progress: 2.1,
            manager: '김주용',
            priority: 'high',
            deadline: '2025-12-10'
        },
        {
            id: 'oasis-spot',
            name: '디지털 OASIS SPOT',
            budget: 3500000000,
            status: 'construction',
            progress: 1.2,
            manager: '임혁',
            priority: 'high',
            deadline: '2025-12-15'
        },
        {
            id: 'drt-service',
            name: 'DRT 서비스 플랫폼',
            budget: 1000000000,
            status: 'ordering',
            progress: 5.0,
            manager: '함정영',
            priority: 'medium',
            deadline: '2025-12-20'
        },
        {
            id: 'network',
            name: '유무선 네트워크 구축',
            budget: 1500000000,
            status: 'completed',
            progress: 96.2,
            manager: '이성호',
            priority: 'low',
            deadline: '2025-11-30'
        },
        {
            id: 'innovation-center',
            name: '이노베이션센터 구축',
            budget: 1300000000,
            status: 'in-progress',
            progress: 93.4,
            manager: '김주용',
            priority: 'low',
            deadline: '2025-12-10'
        }
    ],
    
    // 리스크 현황
    risks: {
        urgent: { count: 2, amount: 6800000000 },
        high: { count: 3, amount: 5100000000 },
        medium: { count: 3, amount: 2200000000 },
        personnelOverload: 7
    },
    
    // 팀 정보
    team: [
        { name: '이성호', role: '상무', area: 'PMO총괄, 인프라' },
        { name: '김주용', role: '책임', area: '사업관리, AI플랫폼' },
        { name: '임혁', role: '책임', area: '설계, OASIS' },
        { name: '함정영', role: '선임', area: '조달, DRT' }
    ]
};

// 노션 URL 생성 함수
function getNotionUrl(type, id) {
    const baseUrl = 'https://www.notion.so/';
    return baseUrl + id.replace(/-/g, '');
}

// 금액 포맷팅 함수
function formatCurrency(amount, unit = '억원') {
    if (unit === '억원') {
        return (amount / 100000000).toFixed(1) + '억원';
    }
    return amount.toLocaleString() + '원';
}

// 진행률 상태 반환
function getProgressStatus(progress) {
    if (progress >= 90) return { text: '완료', color: 'green' };
    if (progress >= 50) return { text: '진행중', color: 'blue' };
    if (progress >= 10) return { text: '초기', color: 'yellow' };
    return { text: '시작전', color: 'red' };
}

// 남은 일수 계산
function calculateDaysRemaining() {
    const endDate = new Date(NOTION_CONFIG.project.endDate);
    const today = new Date();
    const diffTime = endDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// 데이터 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NOTION_CONFIG;
}
