import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Fires a GA4 page_view on every route change. HashRouter navigation (#/shop,
// #/customize, …) doesn't trigger the browser History API the way a real
// navigation would, so gtag's automatic page-view detection never sees it —
// without this, Analytics would only ever record the very first page load.
const AnalyticsTracker = () => {
    const location = useLocation();

    useEffect(() => {
        if (typeof window.gtag !== 'function') return;
        window.gtag('event', 'page_view', {
            page_path:     location.pathname + location.search,
            page_location: window.location.href,
            page_title:    document.title,
        });
    }, [location]);

    return null;
};

export default AnalyticsTracker;
