/**
 * 아산시 스마트시티 예산관리 통합 대시보드
 * 업데이트: 2026-01-13 | 사업기간: 2023.08 ~ 2026.12 (연장승인)
 * Notion MCP 연동 | GitHub Pages 자동 배포
 */

const CONFIG = {
    dataUrl: 'data/budget.json',
    refreshInterval: 300000,
    projectEndDate: new Date('2026-12-31'),
    totalBudget: 24000000000
};

const Utils = {
    formatCurrency(v) {
        if (!v || v === 0) return '0원';
        if (v >= 100000000) return (v / 100000000).toFixed(1) + '억원';
        if (v >= 10000) return (v / 10000).toFixed(0) + '만원';
        return v.toLocaleString() + '원';
    },
    getStatusColor(s) {
        return {'완료':'#10B981','진행중':'#3B82F6','대기':'#6B7280','신규':'#8B5CF6','주의':'#EF4444'}[s] || '#6B7280';
    },
    getStatusEmoji(s) {
        return {'완료':'✅','진행중':'🔄','대기':'⏸️','신규':'🆕','주의':'🔴'}[s] || '📋';
    },
    getMilestoneEmoji(type) {
        return {'보고':'📝','계약':'📄','착수':'🚀','점검':'🔍','마감':'📅'}[type] || '📌';
    },
    getMilestoneStatus(status) {
        return {'완료':'✅ 완료','예정':'📅 예정','진행중':'🔄 진행중'}[status] || status;
    },
    getDaysRemaining() {
        return Math.max(0, Math.ceil((CONFIG.projectEndDate - new Date()) / 86400000));
    }
};

class BudgetDashboard {
    constructor() { this.data = null; this.init(); }
    
    async init() {
        await this.loadData();
        this.render();
        setInterval(() => this.loadData().then(() => this.render()), CONFIG.refreshInterval);
    }
    
    async loadData() {
        try {
            const r = await fetch(CONFIG.dataUrl + '?t=' + Date.now());
            if (!r.ok) throw new Error('로드 실패');
            this.data = await r.json();
        } catch (e) {
            console.error('데이터 로드 오류:', e);
            document.getElementById('error-message').innerHTML = '<div class="error-alert">⚠️ 데이터 로드 오류가 발생했습니다.</div>';
        }
    }
    
    render() {
        if (!this.data) return;
        this.renderHeader();
        this.renderCards();
        this.renderTable();
        this.renderFunding();
        this.renderMilestones();
        this.renderRisks();
        this.renderFooter();
    }
    
    renderHeader() {
        const el = document.getElementById('header-info');
        if (!el) return;
        const d = this.data.project_info?.days_remaining || Utils.getDaysRemaining();
        const ext = this.data.project_info?.extension_approved;
        el.innerHTML = `<div class="header-status">
            <span class="update-badge">📅 최종 업데이트: ${this.data.update_date} ${this.data.update_time}</span>
            <span class="days-badge ${d <= 90 ? 'urgent' : ''}">⏰ D-${d}</span>
            ${ext ? '<span class="extension-badge">✅ 연장승인 (12개월)</span>' : ''}
        </div>`;
    }
    
    renderCards() {
        const s = this.data.summary;
        if (!s) return;
        
        document.getElementById('total-budget').innerHTML = `
            <div class="card-value">${Utils.formatCurrency(CONFIG.totalBudget)}</div>
            <div class="card-label">총 사업비</div>
            <div class="card-sub">국비 120억 + 지방비 120억</div>`;
        
        document.getElementById('allocated-budget').innerHTML = `
            <div class="card-value">${Utils.formatCurrency(s.총예산)}</div>
            <div class="card-label">배정예산</div>
            <div class="card-sub">총 사업비의 100%</div>`;
        
        const rate = s.집행률;
        const color = rate < 30 ? '#EF4444' : rate < 70 ? '#F59E0B' : '#10B981';
        document.getElementById('executed-amount').innerHTML = `
            <div class="card-value">${Utils.formatCurrency(s.총집행)}</div>
            <div class="card-label">집행금액</div>
            <div class="progress-bar"><div class="progress-fill" style="width:${rate}%;background:${color}"></div></div>
            <div class="card-sub">집행률 ${rate}% | 진도율 ${s.진도율 || 42.5}%</div>`;
        
        document.getElementById('remaining-budget').innerHTML = `
            <div class="card-value">${Utils.formatCurrency(s.총잔액)}</div>
            <div class="card-label">미집행 잔액</div>
            <div class="card-sub">${s.남은일수 || Utils.getDaysRemaining()}일 내 집행 필요</div>`;
    }
    
    renderTable() {
        const el = document.getElementById('status-table');
        if (!el || !this.data.units) return;
        
        let h = `<table class="data-table">
            <thead><tr><th>#</th><th>사업명</th><th>예산</th><th>집행</th><th>집행률</th><th>상태</th></tr></thead><tbody>`;
        
        this.data.units.forEach(u => {
            const rc = u.rate > 100 ? 'rate-over' : u.rate < 10 ? 'rate-low' : '';
            h += `<tr>
                <td>${u.id}</td>
                <td><strong>${u.name}</strong><div class="unit-detail">${u.status_detail}</div></td>
                <td>${Utils.formatCurrency(u.budget)}</td>
                <td>${Utils.formatCurrency(u.executed)}</td>
                <td class="${rc}">${u.rate}%</td>
                <td><span class="status-badge" style="background:${Utils.getStatusColor(u.status)}">${Utils.getStatusEmoji(u.status)} ${u.status}</span></td>
            </tr>`;
        });
        el.innerHTML = h + '</tbody></table>';
    }
    
    renderFunding() {
        const el = document.getElementById('funding-table');
        if (!el || !this.data.summary?.재원별) return;
        const f = this.data.summary.재원별;
        
        let h = `<table class="data-table">
            <thead><tr><th>재원</th><th>총 사업비</th><th>배정예산</th><th>집행금액</th><th>집행률</th><th>잔액</th></tr></thead><tbody>`;
        
        const rows = [
            {name: '국비', data: f.국비},
            {name: '도비', data: f.도비},
            {name: '시비', data: f.시비}
        ];
        
        rows.forEach(r => {
            h += `<tr>
                <td><strong>${r.name}</strong></td>
                <td>${Utils.formatCurrency(r.data.총액)} (${r.data.비율}%)</td>
                <td>${Utils.formatCurrency(r.data.총액)}</td>
                <td>${Utils.formatCurrency(r.data.집행)}</td>
                <td>${r.data.집행률}%</td>
                <td>${Utils.formatCurrency(r.data.잔액)}</td>
            </tr>`;
        });
        
        h += `<tr class="total-row">
            <td><strong>합계</strong></td>
            <td><strong>240억원</strong></td>
            <td><strong>240억원</strong></td>
            <td><strong>${Utils.formatCurrency(this.data.summary.총집행)}</strong></td>
            <td><strong>${this.data.summary.집행률}%</strong></td>
            <td><strong>${Utils.formatCurrency(this.data.summary.총잔액)}</strong></td>
        </tr>`;
        
        el.innerHTML = h + '</tbody></table>';
    }
    
    renderMilestones() {
        const el = document.getElementById('milestone-table');
        if (!el || !this.data.milestones) return;
        
        let h = `<table class="data-table">
            <thead><tr><th>일자</th><th>구분</th><th>내용</th><th>상태</th></tr></thead><tbody>`;
        
        this.data.milestones.forEach(m => {
            const statusClass = m.status === '완료' ? 'status-done' : '';
            h += `<tr class="${statusClass}">
                <td>${m.date.substring(5)}</td>
                <td>${Utils.getMilestoneEmoji(m.type)} ${m.type}</td>
                <td>${m.title}</td>
                <td>${Utils.getMilestoneStatus(m.status)}</td>
            </tr>`;
        });
        
        el.innerHTML = h + '</tbody></table>';
    }
    
    renderRisks() {
        const el = document.getElementById('risk-items');
        if (!el || !this.data.risks) return;
        const r = this.data.risks;
        let h = '';
        
        if (r.critical?.length) {
            h += '<div class="risk-section"><h3>🔴 긴급 리스크</h3>';
            r.critical.forEach(x => {
                h += `<div class="risk-item critical">
                    <div class="risk-title">${x.title}</div>
                    <div class="risk-detail">${x.description||''}</div>
                    <div class="risk-meta"><span>영향: ${Utils.formatCurrency(x.impact)}</span>${x.deadline?`<span>마감: ${x.deadline}</span>`:''}</div>
                    ${x.response?`<div class="risk-response">대응: ${x.response}</div>`:''}
                </div>`;
            });
            h += '</div>';
        }
        
        if (r.high?.length) {
            h += '<div class="risk-section"><h3>🟠 높음 리스크</h3>';
            r.high.forEach(x => {
                h += `<div class="risk-item high">
                    <div class="risk-title">${x.title}</div>
                    <div class="risk-meta">영향: ${Utils.formatCurrency(x.impact)}</div>
                    ${x.response?`<div class="risk-response">대응: ${x.response}</div>`:''}
                </div>`;
            });
            h += '</div>';
        }
        
        if (r.medium?.length) {
            h += '<div class="risk-section"><h3>🟡 주의 리스크</h3>';
            r.medium.forEach(x => {
                h += `<div class="risk-item medium">
                    <div class="risk-title">${x.title}</div>
                    <div class="risk-meta">영향: ${Utils.formatCurrency(x.impact)}</div>
                </div>`;
            });
            h += '</div>';
        }
        
        h += `<div class="risk-summary">
            <span>🔴 긴급: ${r.summary?.critical||0}건</span>
            <span>🟠 높음: ${r.summary?.high||0}건</span>
            <span>🟡 주의: ${r.summary?.medium||0}건</span>
            <span>총 ${r.summary?.total||0}건 관리중</span>
        </div>`;
        
        el.innerHTML = h;
    }
    
    renderFooter() {
        const el = document.getElementById('footer-info');
        if (!el) return;
        const p = this.data.project_info || {};
        el.innerHTML = `<div class="footer-grid">
            <div class="footer-item"><strong>사업명</strong><span>${p.name||'아산시 강소형 스마트시티 조성사업'}</span></div>
            <div class="footer-item"><strong>사업기간</strong><span>2023.08 ~ 2026.12 (연장승인)</span></div>
            <div class="footer-item"><strong>총 사업비</strong><span>240억원 (국비 120억 + 지방비 120억)</span></div>
            <div class="footer-item"><strong>연장승인</strong><span>${p.extension_approved?'✅ 2025.12.24 국토부 승인':'❌ 미승인'}</span></div>
        </div>`;
    }
}

document.addEventListener('DOMContentLoaded', () => new BudgetDashboard());
