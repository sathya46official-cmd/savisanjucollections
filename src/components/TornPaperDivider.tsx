"use client";

export default function SmoothFadeTransition() {
    return (
        <div
            className="relative w-full h-[150px] z-30 -mt-[150px] pointer-events-none"
            style={{
                background: "linear-gradient(to bottom, transparent, #F4F2EC)"
            }}
            aria-hidden="true"
        >
        </div>
    );
}

