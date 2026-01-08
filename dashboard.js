/**
 * 아산시 스마트시티 예산관리 통합 대시보드
 * 업데이트: 2026-01-08
 * - 사업기간 연장 반영 (2026-12-31)
 * - 단위사업별 진행률 표시
 */

// 설정
const CONFIG = {
    dataUrl: 'data/budget.json',
    notionProjectUrl: 'https://www.notion.so/21650aa9577d80dc8278e0187c54677f',
    refreshInterval: 300000, // 5분마다 새로고침
    projectEndDate: new Date('2026-12-31'), // 연장된 사업종료일
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
        return value.toFixed(1) + '%';
    },
    
    getStatusColor(status) {
        const colors = {
            '완료': '#10B981',
            '진행중': '#3B82F6',
            '대기': '#6B7280',
            '신규': '#8B5CF6',
            '주의': '#EF4444',
            '정상': '#10B981',
            '초과': '#EF4444',
            '미집행': '#6B7280',
        };
        return colors[status] || '#6B7280';
    },
    
    getStatusEmoji(status) {
        const emojis = {
            '완료': '✅',
            '진행중': '🔄',
            '대기': '⏸️',
            '신규': '🆕',
            '주의': '🔴',
            '정상': '🟢',
            '초과': '🔴',
            '미집행': '⚪',
        };
        return emojis[status] || '📋';
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
    
    showError(message) {
        const errorEl = document.getElementById('error-message');
        if (errorEl) {
            errorEl.innerHTML = `<div class="error-alert">⚠️ ${message}</div>`;
        }
    }
    
    render() {
        if (!this.data) return;
        
        this.renderHeader();
        this.renderSummaryCards();
        this.renderUnitsTable();
        this.renderRiskItems();
        this.renderFooter();
    }
    
    renderHeader() {
        const headerEl = document.getElementById('header-info');
        if (!headerEl) return;
        
        const daysRemaining = Utils.getDaysRemaining();
        const updateDate = this.data.update_date || new Date().toISOString().split('T')[0];
        const updateTime = this.data.update_time || '';
        const extensionApproved = this.data.project_info?.extension_approved;
        
        headerEl.innerHTML = `
            <div class="header-status">
                <span class="update-badge">📅 최종 업데이트: ${updateDate} ${updateTime}</span>
                <span class="days-badge ${daysRemaining <= 90 ? 'urgent' : ''}">
                    ⏰ D-${daysRemaining}
                </span>
                ${extensionApproved ? '<span class="extension-badge">✅ 연장승인 (12개월)</span>' : ''}
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
            const execRate = summary.집행률;
            execEl.innerHTML = `
                <div class="card-value">${Utils.formatCurrency(summary.총집행)}</div>
                <div class="card-label">집행금액</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${execRate}%; background: ${execRate < 30 ? '#EF4444' : execRate < 70 ? '#F59E0B' : '#10B981'}"></div>
                </div>
                <div class="card-sub">집행률 ${execRate}%</div>
            `;
        }
        
        // 잔액 카드
        this.updateCard('remaining-budget', summary.총잔액, '미집행 잔액', 
            `${Utils.getDaysRemaining()}일 내 집행 필요`);
    }
    
    updateCard(id, value, label, sub) {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = `
                <div class="card-value">${Utils.formatCurrency(value)}</div>
                <div class="card-label">${label}</div>
                <div class="card-sub">${sub}</div>
            `;
        }
    }
    
    renderUnitsTable() {
        const tableEl = document.getElementById('status-table');
        if (!tableEl || !this.data.units) return;
        
        let html = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>사업명</th>
                        <th>예산</th>
                        <th>집행</th>
                        <th>집행률</th>
                        <th>상태</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        this.data.units.forEach(unit => {
            const statusColor = Utils.getStatusColor(unit.status);
            const statusEmoji = Utils.getStatusEmoji(unit.status);
            const rateClass = unit.rate > 100 ? 'rate-over' : unit.rate < 10 ? 'rate-low' : '';
            
            html += `
                <tr>
                    <td>${unit.id}</td>
                    <td>
                        <strong>${unit.name}</strong>
                        <div class="unit-detail">${unit.status_detail}</div>
                    </td>
                    <td>${Utils.formatCurrency(unit.budget)}</td>
                    <td>${Utils.formatCurrency(unit.executed)}</td>
                    <td class="${rateClass}">${unit.rate}%</td>
                    <td>
                        <span class="status-badge" style="background: ${statusColor}">
                            ${statusEmoji} ${unit.status}
                        </span>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        tableEl.innerHTML = html;
    }
    
    renderRiskItems() {
        const riskEl = document.getElementById('risk-items');
        if (!riskEl || !this.data.risks) return;
        
        const risks = this.data.risks;
        let html = '';
        
        // 긴급 리스크
        if (risks.critical && risks.critical.length > 0) {
            html += '<div class="risk-section"><h3>🔴 긴급 리스크</h3>';
            risks.critical.forEach(risk => {
                html += `
                    <div class="risk-item critical">
                        <div class="risk-title">${risk.title}</div>
                        <div class="risk-detail">${risk.description || ''}</div>
                        <div class="risk-meta">
                            <span>영향: ${Utils.formatCurrency(risk.impact)}</span>
                            ${risk.deadline ? `<span>마감: ${risk.deadline}</span>` : ''}
                        </div>
                        ${risk.response ? `<div class="risk-response">대응: ${risk.response}</div>` : ''}
                    </div>
                `;
            });
            html += '</div>';
        }
        
        // 높음 리스크
        if (risks.high && risks.high.length > 0) {
            html += '<div class="risk-section"><h3>🟠 높음 리스크</h3>';
            risks.high.forEach(risk => {
                html += `
                    <div class="risk-item high">
                        <div class="risk-title">${risk.title}</div>
                        <div class="risk-meta">영향: ${Utils.formatCurrency(risk.impact)}</div>
                        ${risk.response ? `<div class="risk-response">대응: ${risk.response}</div>` : ''}
                    </div>
                `;
            });
            html += '</div>';
        }
        
        // 요약
        html += `
            <div class="risk-summary">
                <span>🔴 긴급: ${risks.summary?.critical || 0}건</span>
                <span>🟠 높음: ${risks.summary?.high || 0}건</span>
                <span>🟡 주의: ${risks.summary?.medium || 0}건</span>
                <span>총 ${risks.summary?.total || 0}건 관리중</span>
            </div>
        `;
        
        riskEl.innerHTML = html;
    }
    
    renderFooter() {
        const footerEl = document.getElementById('footer-info');
        if (!footerEl) return;
        
        const projectInfo = this.data.project_info || {};
        
        footerEl.innerHTML = `
            <div class="footer-grid">
                <div class="footer-item">
                    <strong>사업명</strong>
                    <span>${projectInfo.name || '아산시 강소형 스마트시티 조성사업'}</span>
                </div>
                <div class="footer-item">
                    <strong>사업기간</strong>
                    <span>2023.08 ~ 2026.12 (연장승인)</span>
                </div>
                <div class="footer-item">
                    <strong>총 사업비</strong>
                    <span>240억원 (국비 120억 + 지방비 120억)</span>
                </div>
                <div class="footer-item">
                    <strong>연장승인</strong>
                    <span>${projectInfo.extension_approved ? '✅ 2025.12.24 국토부 승인' : '❌ 미승인'}</span>
                </div>
            </div>
        `;
    }
    
    setupAutoRefresh() {
        setInterval(() => {
            this.loadData().then(() => this.render());
        }, CONFIG.refreshInterval);
    }
}

// 페이지 로드 시 대시보드 초기화
document.addEventListener('DOMContentLoaded', () => {
    new BudgetDashboard();
});
