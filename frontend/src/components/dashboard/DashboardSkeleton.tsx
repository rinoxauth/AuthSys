'use client';
import { motion } from 'framer-motion';

const shimmer = `relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent`;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export function DashboardSkeleton() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div variants={itemVariants} className={`h-10 w-64 rounded-xl bg-white/5 ${shimmer}`} />

      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-32 rounded-2xl bg-white/5 border border-white/5 ${shimmer}`}
          />
        ))}
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        <div className={`lg:col-span-6 h-[380px] rounded-2xl bg-white/5 border border-white/5 ${shimmer}`} />
        <div className={`lg:col-span-4 h-[380px] rounded-2xl bg-white/5 border border-white/5 ${shimmer}`} />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`h-52 rounded-2xl bg-white/5 border border-white/5 ${shimmer}`} />
        ))}
      </motion.div>
    </motion.div>
  );
}
