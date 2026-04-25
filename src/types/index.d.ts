import React, { HTMLInputAutoCompleteAttribute } from "react";

export interface InputProps {
  label: string;
  placeholder: string;
  className?: string;
  inputType: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  autoComplete?: HTMLInputAutoCompleteAttribute;
}

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className: string;
}

// 댓글 타입 정의
export interface Comment {
  commentIdx: number;
  boardIdx: number;
  commentLike: number;
  commentDepth: number;
  writerId: string;
  commentPerent: number;
  commentContent: string;
  commentRegDate?: string;
  replies?: Comment[];
}

// 자유게시판 타입 정의
export interface FreeBoardPost {
  boardIdx: number;
  boardTitle: string;
  boardContent: string;
  boardRegDate: string;
  boardLike: number;
  boardHits: number;
  boardID: string;
  category: string;
  tags?: string[];
}

export interface FreeBoardApiResponse {
  status: number;
  data: FreeBoardPost[];
  totalCount: number;
  currentCount: number;
}

// 베스트 포스트 타입 정의
export interface BestPost {
  boardIdx: number;
  boardTitle: string;
  boardContent: string;
  boardRegDate: string;
  boardLike: number;
  boardHits: number;
  boardID: string;
  boardType: string;
  weightedScore: number;
}

export interface BestPostApiResponse {
  status: number;
  data: BestPost[];
  message: string;
}

// 카카오맵 타입 정의
declare global {
  interface Window {
    kakao: any;
  }
}

export {};
