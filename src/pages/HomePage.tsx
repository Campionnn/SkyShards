import React from "react";
import { Link } from "react-router-dom";
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
      <div className="text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl lg:text-7xl font-bold">
            <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">Skyblock Shard</span>
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">Calculator</span>
          </h1>

          <p className="text-xl lg:text-2xl text-slate-400 max-w-3xl mx-auto">
            The ultimate tool for optimizing your Hypixel Skyblock shard fusion strategy. Calculate the most efficient paths, account for all modifiers, and plan your materials.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/calculator">
            <button
              className="
                px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-600 
                text-white font-semibold rounded-xl text-lg
                hover:from-purple-600 hover:to-blue-700
                transition-all duration-200
                flex items-center space-x-2 w-full sm:w-auto justify-center
                hover:scale-105 active:scale-95
              "
            >
              <Calculator className="w-5 h-5" />
              <span>Start Calculating</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>

          <Link to="/settings">
            <button
              className="
                px-8 py-4 bg-white/10 backdrop-blur-xl border border-white/20 
                text-white font-semibold rounded-xl text-lg
                hover:bg-white/20
                transition-all duration-200
                flex items-center space-x-2 w-full sm:w-auto justify-center
                hover:scale-105 active:scale-95
              "
            >
              <BarChart3 className="w-5 h-5" />
              <span>Custom Rates</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center hover:scale-105 transition-transform duration-200"
          >
            <div className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">{stat.value}</div>
            <div className="text-slate-400 font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Features Section */}
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Powerful Features</h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">Everything you need to optimize your shard fusion strategy</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200"
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
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center space-y-6 py-16">
        <div className="space-y-4">
          <h2 className="text-3xl lg:text-4xl font-bold text-white">Ready to Optimize Your Strategy?</h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">Start calculating optimal fusion paths and take your Skyblock game to the next level.</p>
        </div>

        <Link to="/calculator">
          <button
            className="
              px-12 py-6 bg-gradient-to-r from-purple-500 to-blue-600 
              text-white font-bold rounded-2xl text-xl
              hover:from-purple-600 hover:to-blue-700
              transition-all duration-200
              flex items-center space-x-3 mx-auto
              shadow-lg shadow-purple-500/25
              hover:scale-105 active:scale-95
            "
          >
            <Calculator className="w-6 h-6" />
            <span>Get Started Now</span>
            <ArrowRight className="w-6 h-6" />
          </button>
        </Link>
      </div>
    </div>
  );
};
