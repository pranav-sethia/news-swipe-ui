import { motion, useMotionValue, useTransform, useAnimation } from "framer-motion";
import { Card, CardContent, Typography } from "@mui/material";
import { useState } from "react";

export default function NewsCard({ article, onSwipe }) {
  const [isExiting, setIsExiting] = useState(false);
  const controls = useAnimation();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-12, 12]);
  const opacity = useTransform(x, [-300, -150, 0, 150, 300], [0.4, 1, 1, 1, 0.4]);

  // ❤️ appears on right when x > 0, ❌ on left when x < 0
  const likeOpacity = useTransform(x, [60, 150], [0, 1]);
  const nopeOpacity = useTransform(x, [-60, -150], [0, 1]);

  const threshold = 120;

  const handleDragEnd = async (_, info) => {
    if (isExiting) return;

    const offsetX = info.offset.x;
    const velocityX = info.velocity.x;

    const shouldLike = offsetX > threshold || velocityX > 600;
    const shouldNope = offsetX < -threshold || velocityX < -600;

    if (shouldLike) {
      setIsExiting(true);
      await controls.start({
        x: 250,
        rotate: 8,
        opacity: 0,
        scale: 0.95,
        transition: { duration: 0.45, ease: "easeOut" },
      });
      onSwipe("right");
    } else if (shouldNope) {
      setIsExiting(true);
      await controls.start({
        x: -250,
        rotate: -8,
        opacity: 0,
        scale: 0.95,
        transition: { duration: 0.45, ease: "easeOut" },
      });
      onSwipe("left");
    } else {
      await controls.start({
        x: 0,
        rotate: 0,
        opacity: 1,
        transition: { type: "spring", stiffness: 420, damping: 35 },
      });
    }
  };

  return (
    <motion.div
      layout
      initial={{ scale: 0.98, y: 12, opacity: 1 }}
      animate={controls}
      style={{
        x,
        rotate,
        opacity,
        position: "absolute",
        width: 380,
        cursor: isExiting ? "default" : "grab",
        display: "flex",
        justifyContent: "center",
      }}
      drag={!isExiting ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: "grabbing" }}
    >
      <Card
        sx={{
          background: "rgba(20, 20, 20, 0.85)",
          color: "white",
          borderRadius: "20px",
          boxShadow: "0px 0px 30px rgba(0,255,255,0.12)",
          backdropFilter: "blur(10px)",
          overflow: "hidden",
          width: "360px",
        }}
      >
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            {article.title}
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(200,200,200,0.9)" }}>
            {article.description}
          </Typography>
        </CardContent>
      </Card>

      {/* ❌ Dislike (left) */}
      <motion.div
        style={{
          position: "absolute",
          top: "18%",
          left: 18,
          color: "#f87171",
          fontSize: "2.6rem",
          fontWeight: "700",
          pointerEvents: "none",
        }}
        initial={{ opacity: 0 }} // prevent flicker
        animate={{
          opacity: isExiting ? 0 : nopeOpacity,
          y: isExiting ? -20 : 0,
          transition: { duration: 0.2, ease: "easeOut" },
        }}
      >
        ❌
      </motion.div>

      {/* ❤️ Like (right) */}
      <motion.div
        style={{
          position: "absolute",
          top: "18%",
          right: 18,
          color: "#4ade80",
          fontSize: "2.6rem",
          fontWeight: "700",
          pointerEvents: "none",
        }}
        initial={{ opacity: 0 }} // prevent flicker
        animate={{
          opacity: isExiting ? 0 : likeOpacity,
          y: isExiting ? -20 : 0,
          transition: { duration: 0.2, ease: "easeOut" },
        }}
      >
        ❤️
      </motion.div>
    </motion.div>
  );
}
