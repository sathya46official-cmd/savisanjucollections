"use client";

import { Shield, Lock, Heart, DollarSign } from "lucide-react";

export default function TrustTransparency() {
  const trustPoints = [
    {
      icon: Shield,
      title: "Your Privacy Protected",
      description: "We never share your contact information with third parties. Your data is secure and confidential."
    },
    {
      icon: Lock,
      title: "Customer-Initiated Contact",
      description: "WhatsApp contact is always customer-initiated. We respect your privacy and never spam."
    },
    {
      icon: Heart,
      title: "Personalized Service",
      description: "Every order receives personal attention. Price negotiation and customization available on request."
    },
    {
      icon: DollarSign,
      title: "No Hidden Charges",
      description: "Final price confirmed before delivery. What you see is what you pay - complete transparency."
    }
  ];

  return (
    <section className="py-16 px-4 bg-[#F4F2EC]">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif text-gray-900 mb-4">
            Trust & Transparency
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Your satisfaction and trust are our top priorities. Here's our commitment to you.
          </p>
        </div>

        {/* Trust Points Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {trustPoints.map((point, index) => {
            const Icon = point.icon;
            return (
              <div 
                key={index} 
                className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
                    <Icon size={24} className="text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="text-lg font-serif text-gray-900 mb-2">
                      {point.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {point.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Additional Assurance */}
        <div className="mt-12 bg-white rounded-lg p-8 text-center shadow-sm">
          <h3 className="text-xl font-serif text-gray-900 mb-3">
            Our Promise to You
          </h3>
          <p className="text-gray-600 max-w-3xl mx-auto leading-relaxed">
            At SaviSanju Collections, we believe in building lasting relationships with our customers. 
            Every saree is a testament to our commitment to quality, authenticity, and exceptional service. 
            Your satisfaction is not just our goal—it's our guarantee.
          </p>
        </div>
      </div>
    </section>
  );
}
