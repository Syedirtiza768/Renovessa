/**
 * Shared content template types for all Renovessa authority content.
 * Each vertical (bathroom, solar, roofing, hvac) exports its own template array.
 *
 * Content is informational, not promotional. No numeric claims that aren't backed
 * by a published estimator configuration. No testimonials or completed-project claims.
 */

export interface ContentTemplate {
  slug: string;
  title: string;
  bodyText: string;
  author: string;
  reviewer: string;
  methodology?: string;
  applicableLocation: string;
  applicableTrade: string;
  status: "draft" | "published";
}
