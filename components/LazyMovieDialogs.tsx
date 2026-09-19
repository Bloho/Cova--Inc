"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { LogFilmDialog as LogDialog } from "@/components/LogFilmDialog";
import type { SearchMovieDialog as SearchDialog } from "@/components/SearchMovieDialog";
import { ClassicSpinner } from "@/components/ui/classic-spinner";

function LoadingDialog() {
  return <div className="modal-backdrop" role="status" aria-label="Loading dialog"><ClassicSpinner theme="dark" /></div>;
}

const Log = dynamic(() => import("@/components/LogFilmDialog").then(module => module.LogFilmDialog), { loading: LoadingDialog, ssr: false });
const Search = dynamic(() => import("@/components/SearchMovieDialog").then(module => module.SearchMovieDialog), { loading: LoadingDialog, ssr: false });

export function LogFilmDialog(props: ComponentProps<typeof LogDialog>) {
  return props.open ? <Log {...props} /> : null;
}
export function SearchMovieDialog(props: ComponentProps<typeof SearchDialog>) {
  return props.open ? <Search {...props} /> : null;
}
