import Image from "next/image";
import styles from "./page.module.scss";

export default function Homepage() {
  return (
    <main className={styles.main}>
      <div className={styles.gradient} />

      <div className={styles.container}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.badge}>
              <span className={styles.badgeText}>🎓 Your Campus Companion</span>
            </div>

            <h1 className={styles.title}>
              <span className={styles.titleLine}>Life @</span>
              <span className={`${styles.titleLine} ${styles.titleHighlight}`}>
                USTC
              </span>
            </h1>

            <p className={styles.subtitle}>
              Your all-in-one app for course schedules, campus resources, and
              student life at USTC
            </p>

            <div className={styles.cta}>
              <Image
                src="/images/appstore.svg"
                alt="Download Life@USTC on the App Store"
                width={150}
                height={44}
                className={styles.appStoreBadge}
                priority
              />
            </div>
          </div>

          <div className={styles.heroImage}>
            <div className={styles.iconWrapper}>
              <Image
                src="/images/icon.png"
                alt="Life@USTC app icon"
                width={280}
                height={280}
                className={styles.icon}
                priority
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className={styles.features}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📚</div>
            <h3 className={styles.featureTitle}>Course Management</h3>
            <p className={styles.featureText}>
              Browse courses, check schedules, and plan your semester
              efficiently
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📅</div>
            <h3 className={styles.featureTitle}>Smart Scheduling</h3>
            <p className={styles.featureText}>
              Get real-time updates on class schedules and room assignments
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🔔</div>
            <h3 className={styles.featureTitle}>Stay Updated</h3>
            <p className={styles.featureText}>
              Never miss important announcements and campus events
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
