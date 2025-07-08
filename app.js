import { initMasterDataModule } from './master_data_logic.js';
import { initMemberPaymentsView } from './member_payments_ui.js';
import { initDailyPaymentsView } from './daily_payments_ui.js';
import { initMonthlySettlementView } from './monthly_settlement_ui.js';
import { initSettingsView } from './settings_ui.js';
import { updateParticipantStatuses } from './payment_logic.js';

document.addEventListener('DOMContentLoaded', async () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then((registration) => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch((error) => {
                console.log('ServiceWorker registration failed: ', error);
            });
    }

    // 미납 회원 상태 업데이트
    try {
        const updatedCount = await updateOverdueParticipantsStatus();
        if (updatedCount > 0) {
            console.log(`${updatedCount}명의 회원이 미납 상태로 변경되었습니다.`);
        }
    } catch (error) {
        console.error('미납 회원 상태 업데이트 실패:', error);
    }

    // lucide 아이콘 초기화 (lucide가 정의된 경우에만)
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    } else {
        console.warn('lucide가 정의되지 않았습니다. 아이콘이 표시되지 않을 수 있습니다.');
    }

    // 네비게이션 메뉴 변경
    const navLinks = document.querySelectorAll('.nav-link');
    const navItems = Array.from(navLinks).map(link => {
        return {
            element: link,
            href: link.getAttribute('href'),
            viewId: link.dataset.view
        };
    });

    // 네비게이션 메뉴 텍스트 변경
    for (const navItem of navItems) {
        if (navItem.href === '#master-data') {
            navItem.element.querySelector('span').textContent = '회원정보';
        } else if (navItem.href === '#member-payments') {
            navItem.element.querySelector('span').textContent = '결제현황 (회원별)';
        } else if (navItem.href === '#daily-payments') {
            navItem.element.querySelector('span').textContent = '결제현황 (일자별)';
        } else if (navItem.href === '#monthly-settlement') {
            navItem.element.querySelector('span').textContent = '월말정산';
        }
    }

    const views = document.querySelectorAll('.app-view');
    const mainContent = document.getElementById('main-content');

    function switchView(viewId) {
        views.forEach(view => {
            if (view.id === viewId) {
                view.classList.remove('hidden');
            } else {
                view.classList.add('hidden');
            }
        });

        navLinks.forEach(link => {
            if (link.dataset.view === viewId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
        
        mainContent.scrollTop = 0; 
        window.scrollTo(0,0);

        if (viewId === 'masterDataView') {
            initMasterDataModule('masterDataView');
        } else if (viewId === 'memberPaymentsView') {
            initMemberPaymentsView('memberPaymentsView');
        } else if (viewId === 'dailyPaymentsView') {
            initDailyPaymentsView('dailyPaymentsView');
        } else if (viewId === 'monthlySettlementView') {
            initMonthlySettlementView('monthlySettlementView');
        } else if (viewId === 'settingsView') {
            initSettingsView('settingsView');
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const viewId = link.dataset.view;
            const currentHash = window.location.hash;
            const targetHash = link.getAttribute('href');
            
            switchView(viewId);
            
            if (currentHash !== targetHash) {
                 history.pushState({ view: viewId }, '', targetHash);
            }
        });
    });
    
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.view) {
            switchView(event.state.view);
        } else {
            const hash = window.location.hash.substring(1);
            let viewToLoad = 'masterDataView'; 
            navLinks.forEach(navLink => {
                if (navLink.getAttribute('href') === `#${hash}`) {
                    viewToLoad = navLink.dataset.view;
                }
            });
            switchView(viewToLoad);
        }
    });

    const initialHash = window.location.hash.substring(1);
    let initialViewId = 'masterDataView'; 
    let initialHref = '#master-data';

    if (initialHash) {
        const activeLink = document.querySelector(`.nav-link[href="#${initialHash}"]`);
        if (activeLink) {
            initialViewId = activeLink.dataset.view;
            initialHref = activeLink.getAttribute('href');
        } else {
             const defaultLink = document.querySelector('.nav-link[data-view="masterDataView"]');
             if(defaultLink) initialHref = defaultLink.getAttribute('href');
        }
    } else {
        const defaultLink = document.querySelector('.nav-link[data-view="masterDataView"]');
        if(defaultLink) initialHref = defaultLink.getAttribute('href');
    }
    
    switchView(initialViewId);
    history.replaceState({ view: initialViewId }, '', initialHref);

});
