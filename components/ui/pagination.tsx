import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { ButtonHTMLAttributes } from "react"

const Pagination = ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <nav
    role="navigation"
    aria-label="Pagination Navigation"
    style={{
      display: "flex",
      justifyContent: "center",
      width: "100%",
      margin: "0 auto"
    }}
    className={className}
    {...props}
  />
)
Pagination.displayName = "Pagination"

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    style={{
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: "8px",
      listStyle: "none",
      padding: 0,
      margin: 0
    }}
    className={className}
    {...props}
  />
))
PaginationContent.displayName = "PaginationContent"

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.HTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => (
  <li ref={ref} style={{ listStyle: "none" }} className={className} {...props} />
))
PaginationItem.displayName = "PaginationItem"

type PaginationLinkProps = {
  isActive?: boolean
  size?: "icon" | "default"
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "size">

const PaginationLink = ({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) => (
  <button
    aria-current={isActive ? "page" : undefined}
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      whiteSpace: "nowrap",
      borderRadius: "12px",
      fontSize: "14px",
      fontWeight: 500,
      fontFamily: "SF Pro Display, Arial, sans-serif",
      transition: "all 0.2s ease",
      border: isActive ? "none" : "1px solid rgba(255, 255, 255, 0.1)",
      backgroundColor: "#000000",
      color: isActive ? "white" : "rgba(255, 255, 255, 0.5)",
      cursor: "pointer",
      ...(size === "icon" ? { width: "40px", height: "40px" } : { padding: "8px 12px" })
    }}
    className={className}
    {...props}
  />
)
PaginationLink.displayName = "PaginationLink"

const PaginationPrevious = ({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <PaginationLink
    aria-label="Go to previous page"
    size="default"
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      paddingRight: "12px",
      paddingLeft: "12px",
      borderRadius: "12px",
      backgroundColor: "#000000",
      border: "1px solid rgba(255, 255, 255, 0.1)"
    }}
    className={className}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </PaginationLink>
)
PaginationPrevious.displayName = "PaginationPrevious"

const PaginationNext = ({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <PaginationLink
    aria-label="Go to next page"
    size="default"
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      paddingLeft: "12px",
      paddingRight: "12px",
      borderRadius: "12px",
      backgroundColor: "#505050",
      border: "1px solid rgba(255, 255, 255, 0.1)"
    }}
    className={className}
    {...props}
  >
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
)
PaginationNext.displayName = "PaginationNext"

const PaginationEllipsis = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    aria-hidden
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "40px",
      height: "40px"
    }}
    className={className}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
)
PaginationEllipsis.displayName = "PaginationEllipsis"

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}
