import { useEffect } from 'react';

const SITE    = 'https://www.legacytraces.com';
const DEFAULT_IMAGE = `${SITE}/og-image.jpg`;

// ── DOM helpers ────────────────────────────────────────────────────────────────

const setName = (name, content) => {
    let el = document.querySelector(`meta[name="${name}"]`);
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', name);
        document.head.appendChild(el);
    }
    el.setAttribute('content', content);
};

const setProp = (property, content) => {
    let el = document.querySelector(`meta[property="${property}"]`);
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
    }
    el.setAttribute('content', content);
};

const setLD = (id, schema) => {
    let el = document.getElementById(id);
    if (!el) {
        el = document.createElement('script');
        el.type = 'application/ld+json';
        el.id   = id;
        document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(schema);
};

const removeLD = (id) => document.getElementById(id)?.remove();

// ── SEO component ──────────────────────────────────────────────────────────────

/**
 * Props:
 *   title       – page title (suffixed with brand)
 *   description – meta description (max ~155 chars)
 *   keywords    – comma-separated keyword string
 *   image       – absolute OG image URL (defaults to /og-image.jpg)
 *   type        – og:type ("website" | "product" | "article")
 *   jsonLd      – Schema.org JSON-LD object/array (null to clear)
 *   noindex     – set true on private/utility pages
 */
const SEO = ({
    title,
    description,
    keywords,
    image,
    type    = 'website',
    jsonLd  = null,
    noindex = false,
}) => {
    const jsonLdStr = JSON.stringify(jsonLd);

    useEffect(() => {
        const fullTitle = title
            ? `${title} | Legacy Traces`
            : 'Legacy Traces – Tamil Culture T-Shirts, Hoodies & Custom Streetwear';
        const fullDesc = description
            || 'Shop premium Tamil culture t-shirts, graphic hoodies & custom streetwear. Design your own t-shirt online. Fast delivery across India.';
        const img = image || DEFAULT_IMAGE;

        // ── Page title
        document.title = fullTitle;

        // ── Standard meta
        setName('description', fullDesc);
        setName('robots',   noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large');
        setName('author',   'Legacy Traces');
        if (keywords) setName('keywords', keywords);

        // ── Open Graph
        setProp('og:site_name',   'Legacy Traces');
        setProp('og:type',        type);
        setProp('og:title',       fullTitle);
        setProp('og:description', fullDesc);
        setProp('og:image',       img);
        setProp('og:image:width',  '1200');
        setProp('og:image:height', '630');
        setProp('og:url',         SITE);
        setProp('og:locale',      'en_IN');

        // ── Twitter Card
        setName('twitter:card',        'summary_large_image');
        setName('twitter:site',        '@LegacyTraces');
        setName('twitter:title',       fullTitle);
        setName('twitter:description', fullDesc);
        setName('twitter:image',       img);

        // ── JSON-LD
        const parsed = JSON.parse(jsonLdStr);
        if (parsed) {
            setLD('page-jsonld', parsed);
        } else {
            removeLD('page-jsonld');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title, description, keywords, image, type, jsonLdStr, noindex]);

    return null;
};

export default SEO;
