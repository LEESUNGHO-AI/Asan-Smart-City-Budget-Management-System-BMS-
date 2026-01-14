/**
 * 아산시 스마트시티 예산관리 통합 대시보드
 * 업데이트: 2026-01-14
 * 사업기간: 2023.08 ~ 2026.12 (연장승인)
 */

var CONFIG = {
    dataUrl: 'data/budget.json',
    refreshInterval: 300000,
    projectEndDate: new Date('2026-12-31'),
    totalBudget: 24000000000
};

var Utils = {
    formatCurrency: function(v) {
        if (!v || v === 0) return '0원';
        if (v >= 100000000) return (v / 100000000).toFixed(1) + '억원';
        if (v >= 10000) return (v / 10000).toFixed(0) + '만원';
        return v.toLocaleString() + '원';
    },
    getStatusColor: function(s) {
        var colors = {
            '완료': '#10B981',
            '진행중': '#3B82F6',
            '대기': '#6B7280',
            '신규': '#8B5CF6',
            '주의': '#EF4444'
        };
        return colors[s] || '#6B7280';
    },
    getStatusEmoji: function(s) {
        var emojis = {
            '완료': '✅',
            '진행중': '🔄',
            '대기': '⏸️',
            '신규': '🆕',
            '주의': '🔴'
        };
        return emojis[s] || '📋';
    },
    getMilestoneEmoji: function(type) {
        var emojis = {
            '보고': '📝',
            '계약': '📄',
            '착수': '🚀',
            '점검': '🔍',
            '마감': '📅'
        };
        return emojis[type] || '📌';
    },
    getMilestoneStatus: function(status) {
        var statuses = {
            '완료': '✅ 완료',
            '예정': '📅 예정',
            '진행중': '🔄 진행중'
        };
        return statuses[status] || status;
    },
    getDaysRemaining: function() {
        var diff = CONFIG.projectEndDate - new Date();
        return Math.max(0, Math.ceil(diff / 86400000));
    }
};

var Dashboard = {
    data: null,

    init: function() {
        var self = this;
        this.loadData(function() {
            self.render();
        });
        setInterval(function() {
            self.loadData(function() {
                self.render();
            });
        }, CONFIG.refreshInterval);
    },

    loadData: function(callback) {
        var self = this;
        var xhr = new XMLHttpRequest();
        xhr.open('GET', CONFIG.dataUrl + '?t=' + Date.now(), true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        self.data = JSON.parse(xhr.responseText);
                        if (callback) callback();
                    } catch (e) {
                        console.error('JSON 파싱 오류:', e);
                        self.showError();
                    }
                } else {
                    console.error('데이터 로드 실패:', xhr.status);
                    self.showError();
                }
            }
        };
        xhr.send();
    },

    showError: function() {
        var el = document.getElementById('error-message');
        if (el) {
            el.innerHTML = '<div class="error-alert">⚠️ 데이터 로드 오류가 발생했습니다. 페이지를 새로고침 해주세요.</div>';
        }
    },

    render: function() {
        if (!this.data) return;
        this.renderHeader();
        this.renderCards();
        this.renderTable();
        this.renderFunding();
        this.renderMilestones();
        this.renderRisks();
        this.renderFooter();
    },

    renderHeader: function() {
        var el = document.getElementById('header-info');
        if (!el) return;
        
        var d = this.data.project_info ? this.data.project_info.days_remaining : Utils.getDaysRemaining();
        if (!d) d = Utils.getDaysRemaining();
        
        var ext = this.data.project_info && this.data.project_info.extension_approved;
        var urgentClass = d <= 90 ? 'urgent' : '';

        el.innerHTML = '<div class="header-status">' +
            '<span class="update-badge">📅 최종 업데이트: ' + this.data.update_date + ' ' + this.data.update_time + '</span>' +
            '<span class="days-badge ' + urgentClass + '">⏰ D-' + d + '</span>' +
            (ext ? '<span class="extension-badge">✅ 연장승인 (12개월)</span>' : '') +
            '</div>';
    },

    renderCards: function() {
        var s = this.data.summary;
        if (!s) return;

        var totalEl = document.getElementById('total-budget');
        if (totalEl) {
            totalEl.innerHTML = '<div class="card-value">' + Utils.formatCurrency(CONFIG.totalBudget) + '</div>' +
                '<div class="card-label">총 사업비</div>' +
                '<div class="card-sub">국비 120억 + 지방비 120억</div>';
        }

        var allocEl = document.getElementById('allocated-budget');
        if (allocEl) {
            allocEl.innerHTML = '<div class="card-value">' + Utils.formatCurrency(s['총예산']) + '</div>' +
                '<div class="card-label">배정예산</div>' +
                '<div class="card-sub">총 사업비의 100%</div>';
        }

        var rate = s['집행률'] || 0;
        var color = rate < 30 ? '#EF4444' : (rate < 70 ? '#F59E0B' : '#10B981');
        var execEl = document.getElementById('executed-amount');
        if (execEl) {
            execEl.innerHTML = '<div class="card-value">' + Utils.formatCurrency(s['총집행']) + '</div>' +
                '<div class="card-label">집행금액</div>' +
                '<div class="progress-bar"><div class="progress-fill" style="width:' + rate + '%;background:' + color + '"></div></div>' +
                '<div class="card-sub">집행률 ' + rate + '% | 진도율 ' + (s['진도율'] || 42.5) + '%</div>';
        }

        var remainEl = document.getElementById('remaining-budget');
        if (remainEl) {
            remainEl.innerHTML = '<div class="card-value">' + Utils.formatCurrency(s['총잔액']) + '</div>' +
                '<div class="card-label">미집행 잔액</div>' +
                '<div class="card-sub">' + (s['남은일수'] || Utils.getDaysRemaining()) + '일 내 집행 필요</div>';
        }
    },

    renderTable: function() {
        var el = document.getElementById('status-table');
        if (!el || !this.data.units) return;

        var h = '<table class="data-table">' +
            '<thead><tr><th>#</th><th>사업명</th><th>예산</th><th>집행</th><th>집행률</th><th>상태</th></tr></thead><tbody>';

        for (var i = 0; i < this.data.units.length; i++) {
            var u = this.data.units[i];
            var rc = u.rate > 100 ? 'rate-over' : (u.rate < 10 ? 'rate-low' : '');
            h += '<tr>' +
                '<td>' + u.id + '</td>' +
                '<td><strong>' + u.name + '</strong><div class="unit-detail">' + u.status_detail + '</div></td>' +
                '<td>' + Utils.formatCurrency(u.budget) + '</td>' +
                '<td>' + Utils.formatCurrency(u.executed) + '</td>' +
                '<td class="' + rc + '">' + u.rate + '%</td>' +
                '<td><span class="status-badge" style="background:' + Utils.getStatusColor(u.status) + '">' + Utils.getStatusEmoji(u.status) + ' ' + u.status + '</span></td>' +
                '</tr>';
        }

        el.innerHTML = h + '</tbody></table>';
    },

    renderFunding: function() {
        var el = document.getElementById('funding-table');
        if (!el) return;
        
        var summary = this.data.summary;
        if (!summary || !summary['재원별']) {
            el.innerHTML = '<p style="text-align:center;color:#999;">재원별 데이터가 없습니다.</p>';
            return;
        }
        
        var f = summary['재원별'];

        var h = '<table class="data-table">' +
            '<thead><tr><th>재원</th><th>총 사업비</th><th>배정예산</th><th>집행금액</th><th>집행률</th><th>잔액</th></tr></thead><tbody>';

        var rows = [
            { name: '국비', data: f['국비'] },
            { name: '도비', data: f['도비'] },
            { name: '시비', data: f['시비'] }
        ];

        for (var i = 0; i < rows.length; i++) {
            var r = rows[i];
            if (r.data) {
                h += '<tr>' +
                    '<td><strong>' + r.name + '</strong></td>' +
                    '<td>' + Utils.formatCurrency(r.data['총액']) + ' (' + (r.data['비율'] || 0) + '%)</td>' +
                    '<td>' + Utils.formatCurrency(r.data['총액']) + '</td>' +
                    '<td>' + Utils.formatCurrency(r.data['집행']) + '</td>' +
                    '<td>' + (r.data['집행률'] || 0) + '%</td>' +
                    '<td>' + Utils.formatCurrency(r.data['잔액']) + '</td>' +
                    '</tr>';
            }
        }

        h += '<tr class="total-row">' +
            '<td><strong>합계</strong></td>' +
            '<td><strong>240억원</strong></td>' +
            '<td><strong>240억원</strong></td>' +
            '<td><strong>' + Utils.formatCurrency(summary['총집행']) + '</strong></td>' +
            '<td><strong>' + (summary['집행률'] || 0) + '%</strong></td>' +
            '<td><strong>' + Utils.formatCurrency(summary['총잔액']) + '</strong></td>' +
            '</tr>';

        el.innerHTML = h + '</tbody></table>';
    },

    renderMilestones: function() {
        var el = document.getElementById('milestone-table');
        if (!el) return;
        
        if (!this.data.milestones || this.data.milestones.length === 0) {
            el.innerHTML = '<p style="text-align:center;color:#999;">마일스톤 데이터가 없습니다.</p>';
            return;
        }

        var h = '<table class="data-table">' +
            '<thead><tr><th>일자</th><th>구분</th><th>내용</th><th>상태</th></tr></thead><tbody>';

        for (var i = 0; i < this.data.milestones.length; i++) {
            var m = this.data.milestones[i];
            var statusClass = m.status === '완료' ? 'status-done' : '';
            var dateStr = m.date ? m.date.substring(5) : '';
            
            h += '<tr class="' + statusClass + '">' +
                '<td>' + dateStr + '</td>' +
                '<td>' + Utils.getMilestoneEmoji(m.type) + ' ' + m.type + '</td>' +
                '<td>' + m.title + '</td>' +
                '<td>' + Utils.getMilestoneStatus(m.status) + '</td>' +
                '</tr>';
        }

        el.innerHTML = h + '</tbody></table>';
    },

    renderRisks: function() {
        var el = document.getElementById('risk-items');
        if (!el || !this.data.risks) return;

        var r = this.data.risks;
        var h = '';

        if (r.critical && r.critical.length > 0) {
            h += '<div class="risk-section"><h3>🔴 긴급 리스크</h3>';
            for (var i = 0; i < r.critical.length; i++) {
                var x = r.critical[i];
                h += '<div class="risk-item critical">' +
                    '<div class="risk-title">' + x.title + '</div>' +
                    '<div class="risk-detail">' + (x.description || '') + '</div>' +
                    '<div class="risk-meta"><span>영향: ' + Utils.formatCurrency(x.impact) + '</span>' +
                    (x.deadline ? '<span>마감: ' + x.deadline + '</span>' : '') + '</div>' +
                    (x.response ? '<div class="risk-response">대응: ' + x.response + '</div>' : '') +
                    '</div>';
            }
            h += '</div>';
        }

        if (r.high && r.high.length > 0) {
            h += '<div class="risk-section"><h3>🟠 높음 리스크</h3>';
            for (var i = 0; i < r.high.length; i++) {
                var x = r.high[i];
                h += '<div class="risk-item high">' +
                    '<div class="risk-title">' + x.title + '</div>' +
                    '<div class="risk-meta">영향: ' + Utils.formatCurrency(x.impact) + '</div>' +
                    (x.response ? '<div class="risk-response">대응: ' + x.response + '</div>' : '') +
                    '</div>';
            }
            h += '</div>';
        }

        if (r.medium && r.medium.length > 0) {
            h += '<div class="risk-section"><h3>🟡 주의 리스크</h3>';
            for (var i = 0; i < r.medium.length; i++) {
                var x = r.medium[i];
                h += '<div class="risk-item medium">' +
                    '<div class="risk-title">' + x.title + '</div>' +
                    '<div class="risk-meta">영향: ' + Utils.formatCurrency(x.impact) + '</div>' +
                    '</div>';
            }
            h += '</div>';
        }

        var summary = r.summary || {};
        h += '<div class="risk-summary">' +
            '<span>🔴 긴급: ' + (summary.critical || 0) + '건</span>' +
            '<span>🟠 높음: ' + (summary.high || 0) + '건</span>' +
            '<span>🟡 주의: ' + (summary.medium || 0) + '건</span>' +
            '<span>총 ' + (summary.total || 0) + '건 관리중</span>' +
            '</div>';

        el.innerHTML = h;
    },

    renderFooter: function() {
        var el = document.getElementById('footer-info');
        if (!el) return;

        var p = this.data.project_info || {};
        el.innerHTML = '<div class="footer-grid">' +
            '<div class="footer-item"><strong>사업명</strong><span>' + (p.name || '아산시 강소형 스마트시티 조성사업') + '</span></div>' +
            '<div class="footer-item"><strong>사업기간</strong><span>2023.08 ~ 2026.12 (연장승인)</span></div>' +
            '<div class="footer-item"><strong>총 사업비</strong><span>240억원 (국비 120억 + 지방비 120억)</span></div>' +
            '<div class="footer-item"><strong>연장승인</strong><span>' + (p.extension_approved ? '✅ 2025.12.24 국토부 승인' : '❌ 미승인') + '</span></div>' +
            '</div>';
    }
};

document.addEventListener('DOMContentLoaded', function() {
    Dashboard.init();
});
