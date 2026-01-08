/**
 * 아산시 스마트시티 예산관리 통합 대시보드
 * 업데이트: 2026-01-08
 */

const CONFIG = {
    dataUrl: 'data/budget.json',
    refreshInterval: 300000,
    projectEndDate: new Date('2026-12-31'),
    totalBudget: 24000000000
};

const Utils = {
    formatCurrency(value) {
        if (!value || value === 0) return '0원';
        if (value >= 100000000) return (value / 100000000).toFixed(1) + '억원';
        if (value >= 10000) return (value / 10000).toFixed(0) + '만원';
        return value.toLocaleString() + '원';
    },
    getStatusColor(status) {
        const colors = {'완료': '#10B981', '진행중': '#3B82F6', '대기': '#6B7280', '신규': '#8B5CF6', '주의': '#EF4444'};
        return colors[status] || '#6B7280';
    },
    getStatusEmoji(status) {
        const emojis = {'완료': '✅', '진행중': '🔄', '대기': '⏸️', '신규': '🆕', '주의': '🔴'};
        return emojis[status] || '📋';
    },
    getDaysRemaining() {
        const diff = CONFIG.projectEndDate - new Date();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }
};

class BudgetDashboard {
    constructor() {
        this.data = null;
        this.init();
    }
    
    async init() {
        await this.loadData();
        this.render();
        setInterval(() => this.loadData().then(() => this.render()), CONFIG.refreshInterval);
    }
    
    async loadData() {
        try {
            const response = await fetch(CONFIG.dataUrl + '?t=' + Date.now());
            if (!response.ok) throw new Error('데이터 로드 실패');
            this.data = await response.json();
        } catch (error) {
            console.error('데이터 로드 오류:', error);
            document.getElementById('error-message').innerHTML = '<div class="error-alert">⚠️ 데이터를 불러오는 중 오류가 발생했습니다.</div>';
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
        const el = document.getElementById('header-info');
        if (!el) return;
        const days = Utils.getDaysRemaining();
        const ext = this.data.project_info?.extension_approved;
        el.innerHTML = `
            <div class="header-status">
                <span class="update-badge">📅 최종 업데이트: ${this.data.update_date} ${this.data.update_time}</span>
                <span class="days-badge ${days <= 90 ? 'urgent' : ''}">⏰ D-${days}</span>
                ${ext ? '<span class="extension-badge">✅ 연장승인 (12개월)</span>' : ''}
            </div>
        `;
    }
    
    renderSummaryCards() {
        const s = this.data.summary;
        if (!s) return;
        
        document.getElementById('total-budget').innerHTML = `
            <div class="card-value">${Utils.formatCurrency(CONFIG.totalBudget)}</div>
            <div class="card-label">총 사업비</div>
            <div class="card-sub">국비 120억 + 지방비 120억</div>
        `;
        
        document.getElementById('allocated-budget').innerHTML = `
            <div class="card-value">${Utils.formatCurrency(s.총예산)}</div>
            <div class="card-label">배정예산</div>
            <div class="card-sub">총 사업비의 100%</div>
        `;
        
        const rate = s.집행률;
        const color = rate < 30 ? '#EF4444' : rate < 70 ? '#F59E0B' : '#10B981';
        document.getElementById('executed-amount').innerHTML = `
            <div class="card-value">${Utils.formatCurrency(s.총집행)}</div>
            <div class="card-label">집행금액</div>
            <div class="progress-bar"><div class="progress-fill" style="width: ${rate}%; background: ${color}"></div></div>
            <div class="card-sub">집행률 ${rate}%</div>
        `;
        
        document.getElementById('remaining-budget').innerHTML = `
            <div class="card-value">${Utils.formatCurrency(s.총잔액)}</div>
            <div class="card-label">미집행 잔액</div>
            <div class="card-sub">${Utils.getDaysRemaining()}일 내 집행 필요</div>
        `;
    }
    
    renderUnitsTable() {
        const el = document.getElementById('status-table');
        if (!el || !this.data.units) return;
        
        let html = `<table class="data-table">
            <thead><tr><th>#</th><th>사업명</th><th>예산</th><th>집행</th><th>집행률</th><th>상태</th></tr></thead><tbody>`;
        
        this.data.units.forEach(u => {
            const rateClass = u.rate > 100 ? 'rate-over' : u.rate < 10 ? 'rate-low' : '';
            html += `<tr>
                <td>${u.id}</td>
                <td><strong>${u.name}</strong><div class="unit-detail">${u.status_detail}</div></td>
                <td>${Utils.formatCurrency(u.budget)}</td>
                <td>${Utils.formatCurrency(u.executed)}</td>
                <td class="${rateClass}">${u.rate}%</td>
                <td><span class="status-badge" style="background: ${Utils.getStatusColor(u.status)}">${Utils.getStatusEmoji(u.status)} ${u.status}</span></td>
            </tr>`;
        });
        
        html += '</tbody></table>';
        el.innerHTML = html;
    }
    
    renderRiskItems() {
        const el = document.getElementById('risk-items');
        if (!el || !this.data.risks) return;
        const r = this.data.risks;
        
        let html = '';
        
        if (r.critical?.length) {
            html += '<div class="risk-section"><h3>🔴 긴급 리스크</h3>';
            r.critical.forEach(risk => {
                html += `<div class="risk-item critical">
                    <div class="risk-title">${risk.title}</div>
                    <div class="risk-detail">${risk.description || ''}</div>
                    <div class="risk-meta"><span>영향: ${Utils.formatCurrency(risk.impact)}</span>${risk.deadline ? `<span>마감: ${risk.deadline}</span>` : ''}</div>
                    ${risk.response ? `<div class="risk-response">대응: ${risk.response}</div>` : ''}
                </div>`;
            });
            html += '</div>';
        }
        
        if (r.high?.length) {
            html += '<div class="risk-section"><h3>🟠 높음 리스크</h3>';
            r.high.forEach(risk => {
                html += `<div class="risk-item high">
                    <div class="risk-title">${risk.title}</div>
                    <div class="risk-meta">영향: ${Utils.formatCurrency(risk.impact)}</div>
                    ${risk.response ? `<div class="risk-response">대응: ${risk.response}</div>` : ''}
                </div>`;
            });
            html += '</div>';
        }
        
        html += `<div class="risk-summary">
            <span>🔴 긴급: ${r.summary?.critical || 0}건</span>
            <span>🟠 높음: ${r.summary?.high || 0}건</span>
            <span>🟡 주의: ${r.summary?.medium || 0}건</span>
            <span>총 ${r.summary?.total || 0}건 관리중</span>
        </div>`;
        
        el.innerHTML = html;
    }
    
    renderFooter() {
        const el = document.getElementById('footer-info');
        if (!el) return;
        const p = this.data.project_info || {};
        el.innerHTML = `
            <div class="footer-grid">
                <div class="footer-item"><strong>사업명</strong><span>${p.name || '아산시 강소형 스마트시티 조성사업'}</span></div>
                <div class="footer-item"><strong>사업기간</strong><span>2023.08 ~ 2026.12 (연장승인)</span></div>
                <div class="footer-item"><strong>총 사업비</strong><span>240억원 (국비 120억 + 지방비 120억)</span></div>
                <div class="footer-item"><strong>연장승인</strong><span>${p.extension_approved ? '✅ 2025.12.24 국토부 승인' : '❌ 미승인'}</span></div>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => new BudgetDashboard());
