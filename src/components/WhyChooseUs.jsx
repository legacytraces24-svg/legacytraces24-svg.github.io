import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Palette, Tag } from 'lucide-react';

const features = [
    {
        icon: <ShieldCheck className="w-10 h-10 text-primary" />,
        title: "Quality Guaranteed",
        description: "Quality is our top priority. Each product is meticulously crafted using premium materials."
    },
    {
        icon: <Palette className="w-10 h-10 text-primary" />,
        title: "Custom Creations",
        description: "Upload your own designs and create personalized apparel that reflects your identity."
    },
    {
        icon: <Tag className="w-10 h-10 text-primary" />,
        title: "Exclusive Offers",
        description: "We regularly roll out special offers so you get the best value on every purchase."
    }
];

const WhyChooseUs = () => {
    return (
        <section className="container mx-auto px-4 py-10 md:py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="text-center mb-8 md:mb-10"
            >
                <h2 className="text-3xl md:text-5xl font-heading font-black uppercase tracking-tight">
                    Why Choose <span className="text-primary">Us?</span>
                </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 max-w-6xl mx-auto">
                {features.map((feature, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        viewport={{ once: true }}
                        className="flex flex-col items-center text-center group p-6 rounded-2xl border border-transparent hover:border-primary/30 hover:bg-primary/5 transition-colors duration-300"
                    >
                        <div className="mb-6 p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
                            {feature.icon}
                        </div>
                        <h3 className="text-xl font-heading font-bold mb-3 uppercase">
                            {feature.title}
                        </h3>
                        <p className="text-gray-600 font-sans leading-relaxed max-w-sm">
                            {feature.description}
                        </p>
                    </motion.div>
                ))}
            </div>
        </section>
    );
};

export default WhyChooseUs;
