import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

interface AnimatedCounterProps {
    value: number;
    direction?: "up" | "down";
    formatter?: (value: number) => string;
    className?: string;
}

export function AnimatedCounter({
    value,
    direction = "up",
    formatter = (v) => v.toString(),
    className,
}: AnimatedCounterProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const motionValue = useMotionValue(direction === "down" ? value : 0);
    const springValue = useSpring(motionValue, {
        damping: 100,
        stiffness: 100,
    });
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    useEffect(() => {
        if (isInView) {
            motionValue.set(direction === "down" ? 0 : value);
        }
    }, [motionValue, isInView, value, direction]);

    useEffect(() => {
        const unsubscribe = springValue.on("change", (latest) => {
            if (ref.current) {
                ref.current.textContent = formatter(Math.round(latest));
            }
        });

        // Set initial value immediately in case no animation occurs (e.g. 0 -> 0)
        if (ref.current) {
            ref.current.textContent = formatter(Math.round(springValue.get()));
        }

        return unsubscribe;
    }, [springValue, formatter]);

    return <span ref={ref} className={className} />;
}
