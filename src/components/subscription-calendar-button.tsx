"use client";

import {
  Bell,
  BellOff,
  Calendar,
  CheckIcon,
  CopyIcon,
  LogIn,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  addSectionToSubscription,
  getSubscriptionState,
  removeSectionFromSubscription,
  type SubscriptionState,
} from "@/app/actions/subscription";
import { Button } from "@/components/ui/button";
import {
  Dialog,
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

interface SubscriptionCalendarButtonProps {
  sectionDatabaseId: number;
  sectionJwId: number;
  showCalendarButton?: boolean;
  showSubscribeButton?: boolean;
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
  copiedLabel: string;
  subscribingLabel: string;
  unsubscribingLabel: string;
  pleaseWaitLabel: string;
  subscribeSuccessLabel: string;
  unsubscribeSuccessLabel: string;
  subscribeSuccessDescriptionLabel: string;
  unsubscribeSuccessDescriptionLabel: string;
  operationFailedLabel: string;
  pleaseRetryLabel: string;
  viewAllSubscriptionsLabel: string;
  loginRequiredLabel: string;
  loginRequiredDescriptionLabel: string;
  loginToSubscribeLabel: string;
  subscriptionCalendarUrlAriaLabel: string;
  singleSectionCalendarUrlAriaLabel: string;
}

export function SubscriptionCalendarButton({
  sectionDatabaseId,
  sectionJwId,
  showCalendarButton = true,
  showSubscribeButton = true,
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
  copiedLabel,
  subscribingLabel,
  unsubscribingLabel,
  pleaseWaitLabel,
  subscribeSuccessLabel,
  unsubscribeSuccessLabel,
  subscribeSuccessDescriptionLabel,
  unsubscribeSuccessDescriptionLabel,
  operationFailedLabel,
  pleaseRetryLabel,
  viewAllSubscriptionsLabel,
  loginRequiredLabel,
  loginRequiredDescriptionLabel,
  loginToSubscribeLabel,
  subscriptionCalendarUrlAriaLabel,
  singleSectionCalendarUrlAriaLabel,
}: SubscriptionCalendarButtonProps) {
  const router = useRouter();
  const [subscriptionState, setSubscriptionState] =
    useState<SubscriptionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOperating, setIsOperating] = useState(false);

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
            title: copiedLabel,
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
            title: copiedLabel,
          });
        }
      },
      timeout: toastTimeout,
    });

  // Fetch subscription state on mount
  const fetchState = useCallback(async () => {
    setIsLoading(true);
    try {
      const state = await getSubscriptionState();
      setSubscriptionState(state);
    } catch (e) {
      console.error("Failed to fetch subscription state:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Derived state
  const isAuthenticated = subscriptionState?.isAuthenticated ?? false;
  const isSubscribed =
    subscriptionState?.subscribedSections.includes(sectionDatabaseId) ?? false;
  const subscriptionIcsUrl = subscriptionState?.subscriptionIcsUrl ?? null;

  // Single section calendar URL
  const singleCalendarUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/sections/${sectionJwId}/calendar.ics`
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
    if (!isAuthenticated) {
      // This shouldn't happen as the button is replaced with login prompt
      return;
    }

    setIsOperating(true);

    const promise = isSubscribed
      ? removeSectionFromSubscription(sectionDatabaseId)
      : addSectionToSubscription(sectionDatabaseId);

    toastManager.promise(promise, {
      loading: {
        title: isSubscribed ? unsubscribingLabel : subscribingLabel,
        description: pleaseWaitLabel,
      },
      success: (newState) => {
        setSubscriptionState(newState);
        setIsOperating(false);
        return {
          title: isSubscribed ? unsubscribeSuccessLabel : subscribeSuccessLabel,
          description: isSubscribed
            ? unsubscribeSuccessDescriptionLabel
            : subscribeSuccessDescriptionLabel,
          actionProps: {
            children: viewAllSubscriptionsLabel,
            onClick: () => {
              router.push("/?tab=subscriptions");
            },
          },
        };
      },
      error: (error) => {
        setIsOperating(false);
        return {
          title: operationFailedLabel,
          description:
            error instanceof Error ? error.message : pleaseRetryLabel,
        };
      },
    });
  };

  // Show skeleton while loading
  if (isLoading) {
    return (
      <div className="flex gap-2">
        {showSubscribeButton && (
          <Button variant="outline" disabled>
            <Bell className="h-5 w-5" />
          </Button>
        )}
        {showCalendarButton && (
          <Button variant="outline" disabled>
            <Calendar className="h-5 w-5" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {/* Subscribe/Unsubscribe Button or Login Prompt */}
      {showSubscribeButton &&
        (isAuthenticated ? (
          <Button
            onClick={handleSubscribeToggle}
            disabled={isOperating}
            variant={isSubscribed ? "default" : "outline"}
            aria-label={isSubscribed ? unsubscribeLabel : subscribeLabel}
          >
            {isSubscribed ? (
              <BellOff className="h-5 w-5" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
          </Button>
        ) : (
          <Dialog>
            <DialogTrigger
              render={<Button variant="outline" aria-label={subscribeLabel} />}
            >
              <Bell className="h-5 w-5" />
            </DialogTrigger>
            <DialogPopup>
              <DialogHeader>
                <DialogTitle>{loginRequiredLabel}</DialogTitle>
                <DialogDescription>
                  {loginRequiredDescriptionLabel}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  {closeLabel}
                </DialogClose>
                <Link href="/signin">
                  <Button>
                    <LogIn className="mr-2 h-4 w-4" />
                    {loginToSubscribeLabel}
                  </Button>
                </Link>
              </DialogFooter>
            </DialogPopup>
          </Dialog>
        ))}

      {/* Calendar Dialog */}
      {showCalendarButton && (
        <Dialog>
          <DialogTrigger
            render={
              <Button variant="outline" aria-label={addToCalendarLabel} />
            }
          >
            <Calendar className="h-5 w-5" />
          </DialogTrigger>
          <DialogPopup>
            <DialogHeader>
              <DialogTitle>{sheetTitle}</DialogTitle>
              <DialogDescription>
                {sheetDescription}{" "}
                <a
                  href="https://en.wikipedia.org/wiki/ICalendar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {learnMoreLabel}
                </a>
              </DialogDescription>
            </DialogHeader>

            <DialogPanel>
              <div className="space-y-6">
                {/* Subscription Calendar (if exists and authenticated) */}
                {isAuthenticated && subscriptionIcsUrl && (
                  <div className="space-y-3">
                    <label
                      htmlFor="subscription-url"
                      className="block font-medium text-small"
                    >
                      {subscriptionUrlLabel}
                    </label>
                    <p className="text-muted-foreground text-small">
                      {subscriptionHintLabel}{" "}
                      <Link
                        href="/?tab=subscriptions"
                        className="text-primary hover:underline"
                      >
                        {viewAllSubscriptionsLabel} →
                      </Link>
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        id="subscription-url"
                        aria-label={subscriptionCalendarUrlAriaLabel}
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
                    className="block font-medium text-small"
                  >
                    {calendarUrlLabel}
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="calendar-url"
                      aria-label={singleSectionCalendarUrlAriaLabel}
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
      )}
    </div>
  );
}
