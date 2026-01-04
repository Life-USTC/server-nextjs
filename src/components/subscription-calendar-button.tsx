"use client";

import { Bell, BellOff, Calendar, CheckIcon, CopyIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { anchoredToastManager, toastManager } from "@/components/ui/toast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { Link } from "@/i18n/routing";
import {
  addSectionToSubscription,
  getSubscriptionIcsUrl,
  isSectionSubscribed,
  removeSectionFromSubscription,
} from "@/lib/subscription-storage";

interface SubscriptionCalendarButtonProps {
  sectionDatabaseId: number;
  addToCalendarLabel: string;
  sheetTitle: string;
  sheetDescription: string;
  calendarUrlLabel: string;
  subscriptionUrlLabel: string;
  copyLabel: string;
  closeLabel: string;
  learnMoreLabel: string;
  subscribeLabel: string;
  unsubscribeLabel: string;
  subscriptionHintLabel: string;
}

export function SubscriptionCalendarButton({
  sectionDatabaseId,
  addToCalendarLabel,
  sheetTitle,
  sheetDescription,
  calendarUrlLabel,
  subscriptionUrlLabel,
  copyLabel,
  closeLabel,
  learnMoreLabel,
  subscribeLabel,
  unsubscribeLabel,
  subscriptionHintLabel,
}: SubscriptionCalendarButtonProps) {
  const _t = useTranslations("common");
  const tSectionDetail = useTranslations("sectionDetail");
  const router = useRouter();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionIcsUrl, setSubscriptionIcsUrl] = useState<string | null>(
    null,
  );

  const singleCopyButtonRef = useRef<HTMLButtonElement>(null);
  const subscriptionCopyButtonRef = useRef<HTMLButtonElement>(null);
  const toastTimeout = 2000;

  const { copyToClipboard: copySingle, isCopied: isSingleCopied } =
    useCopyToClipboard({
      onCopy: () => {
        if (singleCopyButtonRef.current) {
          anchoredToastManager.add({
            data: { tooltipStyle: true },
            positionerProps: { anchor: singleCopyButtonRef.current },
            timeout: toastTimeout,
            title: tSectionDetail("subscription.copied"),
          });
        }
      },
      timeout: toastTimeout,
    });

  const { copyToClipboard: copySubscription, isCopied: isSubscriptionCopied } =
    useCopyToClipboard({
      onCopy: () => {
        if (subscriptionCopyButtonRef.current) {
          anchoredToastManager.add({
            data: { tooltipStyle: true },
            positionerProps: { anchor: subscriptionCopyButtonRef.current },
            timeout: toastTimeout,
            title: tSectionDetail("subscription.copied"),
          });
        }
      },
      timeout: toastTimeout,
    });

  // Check subscription status on mount and when it changes
  useEffect(() => {
    setIsSubscribed(isSectionSubscribed(sectionDatabaseId));
    setSubscriptionIcsUrl(getSubscriptionIcsUrl());
  }, [sectionDatabaseId]);

  // Single section calendar URL
  const singleCalendarUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/sections/${sectionDatabaseId}/calendar.ics`
      : "";

  // Full subscription ICS URL
  const fullSubscriptionUrl =
    typeof window !== "undefined" && subscriptionIcsUrl
      ? `${window.location.origin}${subscriptionIcsUrl}`
      : "";

  const handleCopySingle = () => {
    copySingle(singleCalendarUrl);
  };

  const handleCopySubscription = () => {
    copySubscription(fullSubscriptionUrl);
  };

  const handleSubscribeToggle = async () => {
    setIsLoading(true);

    const promise = isSubscribed
      ? removeSectionFromSubscription(sectionDatabaseId)
      : addSectionToSubscription(sectionDatabaseId);

    toastManager.promise(promise, {
      loading: {
        title: isSubscribed
          ? tSectionDetail("subscription.unsubscribing")
          : tSectionDetail("subscription.subscribing"),
        description: tSectionDetail("subscription.loading"),
      },
      success: () => {
        setIsSubscribed(!isSubscribed);
        setSubscriptionIcsUrl(getSubscriptionIcsUrl());
        setIsLoading(false);
        return {
          title: isSubscribed
            ? tSectionDetail("subscription.unsubscribeSuccess")
            : tSectionDetail("subscription.success"),
          description: isSubscribed
            ? tSectionDetail("subscription.unsubscribeDescription")
            : tSectionDetail("subscription.successDescription"),
          actionProps: {
            children: tSectionDetail("subscription.viewAllSubscriptions"),
            onClick: () => {
              router.push("/me/subscriptions/sections/");
            },
          },
        };
      },
      error: (error) => {
        setIsLoading(false);
        return {
          title: tSectionDetail("subscription.error"),
          description: error instanceof Error ? error.message : "",
        };
      },
    });
  };

  return (
    <div className="flex gap-2">
      {/* Subscribe/Unsubscribe Button */}
      <Button
        onClick={handleSubscribeToggle}
        disabled={isLoading}
        variant={isSubscribed ? "default" : "outline"}
        aria-label={isSubscribed ? unsubscribeLabel : subscribeLabel}
      >
        {isSubscribed ? (
          <BellOff className="h-5 w-5" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
      </Button>

      {/* Calendar Dialog */}
      <Dialog>
        <DialogTrigger
          render={<Button variant="outline" aria-label={addToCalendarLabel} />}
        >
          <Calendar className="h-5 w-5" />
        </DialogTrigger>
        <DialogBackdrop />
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>{sheetTitle}</DialogTitle>
            <DialogDescription>
              {sheetDescription}{" "}
              <a
                href="https://en.wikipedia.org/wiki/ICalendar"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                {learnMoreLabel}
              </a>
            </DialogDescription>
          </DialogHeader>

          <DialogPanel>
            <div className="space-y-6">
              {/* Subscription Calendar (if exists) */}
              {subscriptionIcsUrl && (
                <div className="space-y-3">
                  <label
                    htmlFor="subscription-url"
                    className="text-small font-medium block"
                  >
                    {subscriptionUrlLabel}
                  </label>
                  <p className="text-small text-muted-foreground">
                    {subscriptionHintLabel}{" "}
                    <Link
                      href="/me/subscriptions/sections/"
                      className="text-primary hover:underline"
                    >
                      {tSectionDetail("subscription.viewAllSubscriptions")} →
                    </Link>
                  </p>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="subscription-url"
                      aria-label="Subscription calendar URL"
                      disabled
                      placeholder={fullSubscriptionUrl}
                      type="url"
                    />
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            aria-label={copyLabel}
                            disabled={isSubscriptionCopied}
                            onClick={handleCopySubscription}
                            ref={subscriptionCopyButtonRef}
                            size="icon"
                            variant="outline"
                          />
                        }
                      >
                        {isSubscriptionCopied ? (
                          <CheckIcon className="h-6 w-6" />
                        ) : (
                          <CopyIcon className="h-6 w-6" />
                        )}
                      </TooltipTrigger>
                      <TooltipPopup>
                        <p>{copyLabel}</p>
                      </TooltipPopup>
                    </Tooltip>
                  </div>
                </div>
              )}

              {/* Single Section Calendar */}
              <div className="space-y-3">
                <label
                  htmlFor="calendar-url"
                  className="text-small font-medium block"
                >
                  {calendarUrlLabel}
                </label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="calendar-url"
                    aria-label="Single section calendar URL"
                    disabled
                    placeholder={singleCalendarUrl}
                    type="url"
                  />
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          aria-label={copyLabel}
                          disabled={isSingleCopied}
                          onClick={handleCopySingle}
                          ref={singleCopyButtonRef}
                          size="icon"
                          variant="outline"
                        />
                      }
                    >
                      {isSingleCopied ? (
                        <CheckIcon className="h-6 w-6" />
                      ) : (
                        <CopyIcon className="h-6 w-6" />
                      )}
                    </TooltipTrigger>
                    <TooltipPopup>
                      <p>{copyLabel}</p>
                    </TooltipPopup>
                  </Tooltip>
                </div>
              </div>
            </div>
          </DialogPanel>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {closeLabel}
            </DialogClose>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </div>
  );
}
