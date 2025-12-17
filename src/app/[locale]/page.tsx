import Image from "next/image";
import { getTranslations } from "next-intl/server";
import styles from "./page.module.scss";

export default async function Homepage() {
  const t = await getTranslations("homepage");

  return (
    <main className={styles.main}>
      <div className={styles.gradient} />

      <div className={styles.container}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.badge}>
              <span className={styles.badgeText}>{t("badge")}</span>
            </div>

            <h1 className={styles.title}>
              <span className={styles.titleLine}>{t("title.line1")}</span>
              <span className={`${styles.titleLine} ${styles.titleHighlight}`}>
                {t("title.line2")}
              </span>
            </h1>

            <p className={styles.subtitle}>{t("subtitle")}</p>

            <div className={styles.cta}>
              <a
                href="https://apps.apple.com/us/app/life-ustc/id1660437438"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image
                  src="/images/appstore.svg"
                  alt={t("downloadBadgeAlt")}
                  width={150}
                  height={44}
                  className={styles.appStoreBadge}
                  priority
                />
              </a>
            </div>
          </div>

          <div className={styles.heroImage}>
            <div className={styles.iconWrapper}>
              <Image
                src="/images/icon.png"
                alt={t("appIconAlt")}
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
            <div className={styles.featureIcon}>
              {t("features.courseManagement.icon")}
            </div>
            <h3 className={styles.featureTitle}>
              {t("features.courseManagement.title")}
            </h3>
            <p className={styles.featureText}>
              {t("features.courseManagement.description")}
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              {t("features.smartScheduling.icon")}
            </div>
            <h3 className={styles.featureTitle}>
              {t("features.smartScheduling.title")}
            </h3>
            <p className={styles.featureText}>
              {t("features.smartScheduling.description")}
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              {t("features.stayUpdated.icon")}
            </div>
            <h3 className={styles.featureTitle}>
              {t("features.stayUpdated.title")}
            </h3>
            <p className={styles.featureText}>
              {t("features.stayUpdated.description")}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
