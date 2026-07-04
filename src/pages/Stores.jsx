import React from 'react';
import StoreLocations from '../components/StoreLocations';
import SEO from '../components/SEO';

const Stores = () => {
    return (
        <main className="pt-6 pb-10">
            <SEO
                title="Our Stores – Visit Legacy Traces"
                description="Find Legacy Traces stores near you. Visit us in person to explore premium Tamil-inspired streetwear, exclusive collections, and personalized assistance."
                keywords="Legacy Traces store locations, Tamil streetwear store, Legacy Traces Coimbatore"
                jsonLd={{
                    '@context': 'https://schema.org',
                    '@type': 'WebPage',
                    'name': 'Our Stores – Legacy Traces',
                    'url': 'https://www.legacytraces.com/#/stores',
                    'isPartOf': { '@id': 'https://www.legacytraces.com/#website' },
                    'breadcrumb': {
                        '@type': 'BreadcrumbList',
                        'itemListElement': [
                            { '@type': 'ListItem', 'position': 1, 'name': 'Home',   'item': 'https://www.legacytraces.com/' },
                            { '@type': 'ListItem', 'position': 2, 'name': 'Stores', 'item': 'https://www.legacytraces.com/#/stores' }
                        ]
                    }
                }}
            />
            <StoreLocations />
        </main>
    );
};

export default Stores;
