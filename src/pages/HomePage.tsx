import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calculator, Zap, Target, BarChart3, ArrowRight } from "lucide-react";

export const HomePage: React.FC = () => {
  const features = [
    {
      icon: Calculator,
      title: "Optimal Fusion Paths",
      description: "Calculate the most efficient way to craft any shard using advanced algorithms.",
      color: "from-purple-500 to-blue-600",
    },
    {
      icon: Zap,
      title: "Fortune Calculations",
      description: "Account for Hunter Fortune, pet levels, and all modifiers for accurate results.",
      color: "from-yellow-500 to-orange-600",
    },
    {
      icon: Target,
      title: "Material Planning",
      description: "See exactly what materials you need and how long it will take to gather them.",
      color: "from-green-500 to-emerald-600",
    },
    {
      icon: BarChart3,
      title: "Custom Rates",
      description: "Set your own gathering rates for personalized calculations.",
      color: "from-blue-500 to-cyan-600",
    },
  ];

  const stats = [
    { value: "500+", label: "Shards Supported" },
    { value: "99.9%", label: "Accuracy" },
    { value: "<100ms", label: "Calculation Time" },
    { value: "24/7", label: "Availability" },
  ];

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-8">
        <div className="space-y-4">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-5xl lg:text-7xl font-bold">
            <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">Skyblock Shard</span>
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">Calculator</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xl lg:text-2xl text-slate-400 max-w-3xl mx-auto">
            The ultimate tool for optimizing your Hypixel Skyblock shard fusion strategy. Calculate the most efficient paths, account for all modifiers, and plan your materials.
          </motion.p>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/calculator">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="
                px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-600 
                text-white font-semibold rounded-xl text-lg
                hover:from-purple-600 hover:to-blue-700
                transition-all duration-200
                flex items-center space-x-2 w-full sm:w-auto justify-center
              "
            >
              <Calculator className="w-5 h-5" />
              <span>Start Calculating</span>
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </Link>

          <Link to="/settings">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="
                px-8 py-4 bg-white/10 backdrop-blur-xl border border-white/20 
                text-white font-semibold rounded-xl text-lg
                hover:bg-white/20
                transition-all duration-200
                flex items-center space-x-2 w-full sm:w-auto justify-center
              "
            >
              <BarChart3 className="w-5 h-5" />
              <span>Custom Rates</span>
            </motion.button>
          </Link>
        </motion.div>
      </motion.div>

      {/* Stats Section */}
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            whileHover={{ scale: 1.05 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center"
          >
            <div className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">{stat.value}</div>
            <div className="text-slate-400 font-medium">{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Features Section */}
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Powerful Features</h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">Everything you need to optimize your shard fusion strategy</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* CTA Section */}
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="text-center space-y-6 py-16">
        <div className="space-y-4">
          <h2 className="text-3xl lg:text-4xl font-bold text-white">Ready to Optimize Your Strategy?</h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">Start calculating optimal fusion paths and take your Skyblock game to the next level.</p>
        </div>

        <Link to="/calculator">
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(139, 92, 246, 0.3)" }}
            whileTap={{ scale: 0.95 }}
            className="
              px-12 py-6 bg-gradient-to-r from-purple-500 to-blue-600 
              text-white font-bold rounded-2xl text-xl
              hover:from-purple-600 hover:to-blue-700
              transition-all duration-200
              flex items-center space-x-3 mx-auto
              shadow-lg shadow-purple-500/25
            "
          >
            <Calculator className="w-6 h-6" />
            <span>Get Started Now</span>
            <ArrowRight className="w-6 h-6" />
          </motion.button>
        </Link>
      </motion.div>
    </div>
  );
};
