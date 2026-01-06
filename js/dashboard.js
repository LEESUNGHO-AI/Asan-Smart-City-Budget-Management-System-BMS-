/**
 * 아산시 스마트시티 예산관리 통합 대시보드
 * Notion 데이터 기반 실시간 업데이트
 */

// 설정
const CONFIG = {
    dataUrl: 'data/budget.json',
    notionDbUrl: 'https://www.notion.so/54bfedc3769e43e8bdbcd59f22008417',
    notionProjectUrl: 'https://www.notion.so/21650aa9577d80dc8278e0187c54677f',
    refreshInterval: 300000, // 5분마다 새로고침
    projectEndDate: new Date('2025-12-31'),
    totalBudget: 24000000000, // 240억원
};

// 유틸리티 함수
const Utils = {
    formatCurrency(value) {
        if (!value || value === 0) return '0원';
        if (value >= 100000000) {
            return (value / 100000000).toFixed(1) + '억원';
        } else if (value >= 10000) {
            return (value / 10000).toFixed(0) + '만원';
        }
        return value.toLocaleString() + '원';
    },
    
    formatPercent(value) {
        if (!value) return '0%';
        return (value * 100).toFixed(1) + '%';
    },
    
    getStatusColor(status) {
        const colors = {
            '정상': '#10B981',
            '주의': '#F59E0B',
            '초과': '#EF4444',
            '미집행': '#6B7280',
        };
        return colors[status] || '#6B7280';
    },
    
    getStatusEmoji(status) {
        const emojis = {
            '정상': '🟢',
            '주의': '🟡',
            '초과': '🔴',
            '미집행': '⚪',
        };
        return emojis[status] || '⚪';
    },
    
    getDaysRemaining() {
        const today = new Date();
        const diff = CONFIG.projectEndDate - today;
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    },
    
    formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
};

// 대시보드 클래스
class BudgetDashboard {
    constructor() {
        this.data = null;
        this.init();
    }
    
    async init() {
        await this.loadData();
        this.render();
        this.setupAutoRefresh();
    }
    
    async loadData() {
        try {
            const response = await fetch(CONFIG.dataUrl + '?t=' + Date.now());
            if (!response.ok) throw new Error('데이터 로드 실패');
            this.data = await response.json();
            console.log('📊 데이터 로드 완료:', this.data);
        } catch (error) {
            console.error('❌ 데이터 로드 오류:', error);
            this.showError('데이터를 불러오는 중 오류가 발생했습니다.');
        }
    }
    
    render() {
        if (!this.data) return;
        
        this.renderHeader();
        this.renderSummaryCards();
        this.renderBimokChart();
        this.renderStatusTable();
        this.renderRiskItems();
        this.renderFooter();
    }
    
    renderHeader() {
        const headerEl = document.getElementById('header-info');
        if (!headerEl) return;
        
        const daysRemaining = Utils.getDaysRemaining();
        const updateDate = this.data.update_date || new Date().toISOString().split('T')[0];
        const updateTime = this.data.update_time || '';
        
        headerEl.innerHTML = `
            <div class="header-status">
                <span class="update-badge">📅 최종 업데이트: ${updateDate} ${updateTime}</span>
                <span class="days-badge ${daysRemaining <= 30 ? 'urgent' : ''}">
                    ⏰ D-${daysRemaining}
                </span>
            </div>
        `;
    }
    
    renderSummaryCards() {
        const summary = this.data.summary;
        if (!summary) return;
        
        // 총 사업비 카드
        this.updateCard('total-budget', CONFIG.totalBudget, '총 사업비', '국비 120억 + 지방비 120억');
        
        // 배정예산 카드
        this.updateCard('allocated-budget', summary.총예산, '배정예산', 
            `총 사업비의 ${(summary.총예산 / CONFIG.totalBudget * 100).toFixed(1)}%`);
        
        // 집행금액 카드
        const execEl = document.getElementById('executed-amount');
        if (execEl) {
            execEl.innerHTML = `
                <div class="card-value">${Utils.formatCurrency(summary.총집행)}</div>
                <div class="card-label">집행금액</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${summary.집행률}%; background: ${summary.집행률 < 30 ? '#EF4444' : summary.집행률 < 70 ? '#F59E0B' : '#10B981'}"></div>
                </div>
                <div class="card-sub">집행률 ${summary.집행률}%</div>
            `;
        }
        
        // 잔액 카드
        this.updateCard('remaining-budget', summary.총잔액, '미집행 잔액', 
            `${summary.상태별?.미집행 || 0}개 항목 미착수`);
    }
    
    updateCard(elementId, value, label, subText) {
        const el = document.getElementById(elementId);
        if (!el) return;
        
        el.innerHTML = `
            <div class="card-value">${Utils.formatCurrency(value)}</div>
            <div class="card-label">${label}</div>
            <div class="card-sub">${subText}</div>
        `;
    }
    
    renderBimokChart() {
        const chartEl = document.getElementById('bimok-chart');
        if (!chartEl || !this.data.summary?.비목별) return;
        
        const bimok = this.data.summary.비목별;
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
        
        let html = '<div class="bimok-list">';
        let index = 0;
        
        for (const [name, data] of Object.entries(bimok)) {
            const rate = data.예산 > 0 ? (data.집행 / data.예산 * 100).toFixed(1) : 0;
            html += `
                <div class="bimok-item">
                    <div class="bimok-header">
                        <span class="bimok-name" style="border-left: 4px solid ${colors[index % colors.length]}">${name}</span>
                        <span class="bimok-rate">${rate}%</span>
                    </div>
                    <div class="bimok-progress">
                        <div class="bimok-progress-fill" style="width: ${Math.min(100, rate)}%; background: ${colors[index % colors.length]}"></div>
                    </div>
                    <div class="bimok-values">
                        <span>예산: ${Utils.formatCurrency(data.예산)}</span>
                        <span>집행: ${Utils.formatCurrency(data.집행)}</span>
                    </div>
                </div>
            `;
            index++;
        }
        
        html += '</div>';
        chartEl.innerHTML = html;
    }
    
    renderStatusTable() {
        const tableEl = document.getElementById('status-table');
        if (!tableEl || !this.data.items) return;
        
        // 집행률 기준 정렬 (미집행 → 주의 → 초과 순)
        const sortedItems = [...this.data.items].sort((a, b) => {
            const priority = {'초과': 0, '미집행': 1, '주의': 2, '정상': 3};
            return (priority[a.상태] || 4) - (priority[b.상태] || 4);
        });
        
        let html = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>상태</th>
                        <th>항목명</th>
                        <th>비목</th>
                        <th class="number">총예산</th>
                        <th class="number">집행액</th>
                        <th class="number">잔액</th>
                        <th class="number">집행률</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        for (const item of sortedItems.slice(0, 20)) {
            const rate = item.집행률 ? (item.집행률 * 100).toFixed(1) : 0;
            html += `
                <tr class="status-${item.상태 || '미집행'}">
                    <td><span class="status-badge">${Utils.getStatusEmoji(item.상태)} ${item.상태 || '미집행'}</span></td>
                    <td>${item.항목명}</td>
                    <td>${item.비목 || '-'}</td>
                    <td class="number">${Utils.formatCurrency(item.총예산)}</td>
                    <td class="number">${Utils.formatCurrency(item.사용금액_합계)}</td>
                    <td class="number ${item.잔액 < 0 ? 'negative' : ''}">${Utils.formatCurrency(item.잔액)}</td>
                    <td class="number">
                        <div class="mini-progress">
                            <div class="mini-progress-fill" style="width: ${Math.min(100, rate)}%"></div>
                        </div>
                        ${rate}%
                    </td>
                </tr>
            `;
        }
        
        html += '</tbody></table>';
        
        if (sortedItems.length > 20) {
            html += `<div class="table-more">총 ${sortedItems.length}개 항목 중 20개 표시</div>`;
        }
        
        tableEl.innerHTML = html;
    }
    
    renderRiskItems() {
        const riskEl = document.getElementById('risk-items');
        if (!riskEl || !this.data.items) return;
        
        // 리스크 항목 (초과 또는 미집행 중 예산이 큰 항목)
        const riskItems = this.data.items
            .filter(item => item.상태 === '초과' || (item.상태 === '미집행' && item.총예산 >= 100000000))
            .sort((a, b) => b.총예산 - a.총예산)
            .slice(0, 5);
        
        if (riskItems.length === 0) {
            riskEl.innerHTML = '<p class="no-risk">✅ 현재 긴급 대응이 필요한 항목이 없습니다.</p>';
            return;
        }
        
        let html = '<div class="risk-list">';
        
        for (const item of riskItems) {
            const isOverBudget = item.잔액 < 0;
            html += `
                <div class="risk-item ${isOverBudget ? 'over-budget' : 'not-executed'}">
                    <div class="risk-icon">${isOverBudget ? '🔴' : '⚪'}</div>
                    <div class="risk-content">
                        <div class="risk-title">${item.항목명}</div>
                        <div class="risk-detail">
                            ${isOverBudget 
                                ? `예산 초과: ${Utils.formatCurrency(Math.abs(item.잔액))}` 
                                : `미집행 예산: ${Utils.formatCurrency(item.총예산)}`
                            }
                        </div>
                    </div>
                    <div class="risk-action">
                        ${isOverBudget ? '예산 조정 필요' : '긴급 집행 필요'}
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        riskEl.innerHTML = html;
    }
    
    renderFooter() {
        const footerEl = document.getElementById('footer-info');
        if (!footerEl) return;
        
        footerEl.innerHTML = `
            <div class="footer-links">
                <a href="${CONFIG.notionDbUrl}" target="_blank">📋 Notion 예산 DB</a>
                <a href="${CONFIG.notionProjectUrl}" target="_blank">📊 프로젝트 관리</a>
            </div>
            <div class="footer-meta">
                데이터 소스: Notion API | 자동 동기화: 매시간
            </div>
        `;
    }
    
    showError(message) {
        const errorEl = document.getElementById('error-message');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
    }
    
    setupAutoRefresh() {
        setInterval(() => {
            this.loadData().then(() => this.render());
        }, CONFIG.refreshInterval);
    }
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    new BudgetDashboard();
});
