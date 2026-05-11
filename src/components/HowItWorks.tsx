"use client";

import { ShoppingBag, MessageCircle, CheckCircle, Truck } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      icon: ShoppingBag,
      title: "Browse Our Collection",
      description: "Explore our exclusive collection of luxury sarees, each piece carefully curated for elegance and quality."
    },
    {
      icon: MessageCircle,
      title: "Personalized Consultation",
      description: "Add items to cart and proceed to checkout. Our team will contact you to confirm details and discuss pricing."
    },
    {
      icon: CheckCircle,
      title: "Pay After Satisfaction",
      description: "No upfront payment required. Pay via COD or UPI at your doorstep after you're completely satisfied."
    },
    {
      icon: Truck,
      title: "Doorstep Delivery",
      description: "Estimated delivery: 5-6 business days (may vary based on location). Track your order every step of the way."
    }
  ];

  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Experience our consultation-based shopping model designed for your convenience and satisfaction
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative">
                {/* Step Number */}
                <div className="absolute -top-4 -left-4 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                  {index + 1}
                </div>

                {/* Card */}
                <div className="bg-[#F4F2EC] rounded-lg p-6 h-full hover:shadow-lg transition-shadow">
                  {/* Icon */}
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <Icon size={24} className="text-gray-900" />
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-serif text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Connector Line (desktop only) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 -right-4 w-8 h-0.5 bg-gray-300" />
                )}
              </div>
            );
          })}
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <div className="inline-block bg-[#F4F2EC] rounded-lg px-6 py-4">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Need help?</span> Contact us at{" "}
              <a 
                href="mailto:support@savisanju.com" 
                className="text-gray-900 underline hover:text-gray-700 transition-colors"
              >
                support@savisanju.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
