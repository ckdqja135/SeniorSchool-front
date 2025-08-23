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
  replies?: Comment[];
}

// 카카오맵 타입 정의
declare global {
  interface Window {
    kakao: any;
  }
}

export {};
