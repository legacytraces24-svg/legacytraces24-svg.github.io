import React from 'react';
import { motion } from 'framer-motion';
import { getImageUrl } from '../api/api';
import SEO from '../components/SEO';

const About = () => {
    return (
        <div className="pt-20 pb-16">
            <SEO
                title="About Us – Tamil Culture Streetwear Brand"
                description="Legacy Traces is a Tamil culture streetwear brand creating premium graphic t-shirts and hoodies that celebrate Tamil heritage. Learn about our story, mission and values."
                keywords="Legacy Traces brand, Tamil streetwear brand, about Legacy Traces, Tamil culture clothing brand, graphic tee brand India"
                jsonLd={{
                    '@context': 'https://schema.org',
                    '@type': 'AboutPage',
                    'name': 'About Legacy Traces',
                    'url': 'https://www.legacytraces.com/#/about',
                    'description': 'Legacy Traces – a Tamil culture streetwear brand celebrating heritage through premium t-shirts and hoodies.',
                    'isPartOf': { '@id': 'https://www.legacytraces.com/#website' },
                    'about': { '@id': 'https://www.legacytraces.com/#organization' },
                    'breadcrumb': {
                        '@type': 'BreadcrumbList',
                        'itemListElement': [
                            { '@type': 'ListItem', 'position': 1, 'name': 'Home',  'item': 'https://www.legacytraces.com/' },
                            { '@type': 'ListItem', 'position': 2, 'name': 'About', 'item': 'https://www.legacytraces.com/#/about' }
                        ]
                    }
                }}
            />
            {/* Hero Section */}
            <section className="bg-gray-50 dark:bg-[#1a1a1a] py-20 transition-colors duration-300">
                <div className="container mx-auto px-4 text-center">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-5xl md:text-7xl font-bold font-heading mb-6 text-black dark:text-white"
                    >
                        MORE THAN JUST <span className="text-primary">FABRIC.</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed"
                    >
                        We are a movement. A tribute to the oldest living language in the world and the swagger of the streets.
                    </motion.p>
                </div>
            </section>

            {/* Content Section */}
            <section className="py-20">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col lg:flex-row items-center gap-12">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="lg:w-1/2"
                        >
                            <div className="relative group">
                                <div className="absolute -inset-4 bg-primary/20 rounded-2xl blur-2xl group-hover:bg-primary/30 transition-all duration-500"></div>
                                <img
                                    src={getImageUrl('1-Cmx-r6YsTwMuaFn4fzL4m6i9UySrlNr')}
                                    alt="Tamil Culture Streetwear"
                                    className="relative rounded-2xl shadow-2xl w-full object-cover aspect-square"
                                />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="lg:w-1/2"
                        >
                            <h2 className="text-4xl font-bold font-heading mb-6 text-black dark:text-white">
                                BORN IN <span className="text-primary">TAMIL NADU</span>
                            </h2>
                            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                                LEGACY TRACES was founded with a simple mission: to bridge the gap between our rich heritage and modern streetwear culture. We grew up watching mass movies, reading epic history, and celebrating festivals with unparalleled energy. We wanted to wear that pride.
                            </p>
                            <p className="text-lg text-gray-600 dark:text-gray-400 mb-10 leading-relaxed">
                                Every design is created in-house by artists who live and breathe Tamil culture. From the intricate details of Chola architecture to the punch dialogues that define generations, our designs tell a story.
                            </p>

                            <div className="grid grid-cols-3 gap-8">
                                <div className="text-center lg:text-left">
                                    <h3 className="text-3xl font-bold text-primary mb-1">100%</h3>
                                    <p className="text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400">Original Designs</p>
                                </div>
                                <div className="text-center lg:text-left">
                                    <h3 className="text-3xl font-bold text-primary mb-1">50k+</h3>
                                    <p className="text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400">Happy Customers</p>
                                </div>
                                <div className="text-center lg:text-left">
                                    <h3 className="text-3xl font-bold text-primary mb-1">2024</h3>
                                    <p className="text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400">Est. Year</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Philosophy Section */}
            <section className="py-20 bg-black text-white">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-4xl font-bold font-heading mb-12">OUR PHILOSOPHY</h2>
                        <div className="grid md:grid-cols-3 gap-12">
                            <div>
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20">
                                    <span className="text-primary text-2xl font-bold">01</span>
                                </div>
                                <h4 className="text-xl font-bold mb-4">Authenticity</h4>
                                <p className="text-gray-400">No generic graphics. Every element has deep roots in Tamil history and pop culture.</p>
                            </div>
                            <div>
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20">
                                    <span className="text-primary text-2xl font-bold">02</span>
                                </div>
                                <h4 className="text-xl font-bold mb-4">Quality</h4>
                                <p className="text-gray-400">Premium heavy-weight cotton that lasts as long as the legacy we represent.</p>
                            </div>
                            <div>
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20">
                                    <span className="text-primary text-2xl font-bold">03</span>
                                </div>
                                <h4 className="text-xl font-bold mb-4">Community</h4>
                                <p className="text-gray-400">Building a global tribe of Tamilians who wear their identity with confidence.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default About;
