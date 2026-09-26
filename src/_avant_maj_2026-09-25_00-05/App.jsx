import { useState, useEffect, useRef, useContext, createContext, Component } from "react";
import {
  ScanLine, ShoppingCart, Boxes, History, ShieldCheck, Plus, Minus,
  Trash2, X, Check, AlertTriangle, LogOut, Search, TrendingUp,
  PackagePlus, Pencil, Beer, CupSoda, Droplets, Citrus, Receipt,
  Wallet, CreditCard, Truck, Users, Download, Printer, Store, ChevronDown, ChevronLeft, ChevronRight,
  Wine, Martini, Coffee, Milk, GlassWater, Bell,
  ClipboardList, ArrowUpCircle, ArrowDownCircle, Layers, ClipboardCheck, Camera, Sun, Moon, Mic, Star, Volume2, UserPlus, User, Gift, MessageCircle, Lock, Unlock,
  Zap, Rocket, Crown, Building2, Infinity, Barcode, Banknote, Smartphone, Clock, KeyRound, CalendarCheck, RefreshCw, Croissant, Cookie, Popcorn, FileText, Scale, Coins, PackageX, CheckSquare,
  Phone, Send, Paperclip, HelpCircle, ExternalLink, Copy, Headphones, Play, UserMinus, MoreVertical, PackageCheck, Undo2,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import * as Tone from "tone";
import * as api from "./api.js";
import { scheduleLicenseReminders } from "./licenseNotifications.js";
import { exportCsvFile, exportPdfDoc, shareText, exportBinaryFile } from "./nativeExport.js";
import { ReceiptCodes } from "./ReceiptCodes.jsx";
import { isPrinterFeatureAvailable, printReceipt, printCreditReceipt, printAvoirReceipt, printCombinedAvoirReceipt, isBluetoothPrintDisabled, setBluetoothPrintDisabled, printCashReport, printReturnReceipt } from "./printer.js";

const GESTIONE_ICON_DATA_URI = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDI0IDEwMjQiIHdpZHRoPSIxMDI0IiBoZWlnaHQ9IjEwMjQiIHJvbGU9ImltZyIgYXJpYS1sYWJlbGxlZGJ5PSJpY29uVGl0bGUiPgogIDx0aXRsZSBpZD0iaWNvblRpdGxlIj5HZXN0aU9uZSDigJQgaWPDtG5lIGRlIGwnYXBwbGljYXRpb248L3RpdGxlPgogIDxkZWZzPgogICAgPCEtLSA9PT09PT09PT09PT09PT09PSBEw4lHUkFEw4lTIChtb2RpZmlhYmxlKSA9PT09PT09PT09PT09PT09PSAtLT4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iYmdHcmFkIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiICBzdG9wLWNvbG9yPSIjMDYzQjczIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iNTUlIiBzdG9wLWNvbG9yPSIjMDYxQjQ1Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzA2MUI0NSIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxyYWRpYWxHcmFkaWVudCBpZD0iZ2xvd0dyYWQiIGN4PSIxNSUiIGN5PSIxMCUiIHI9Ijc1JSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiICBzdG9wLWNvbG9yPSIjMDBEOUE1IiBzdG9wLW9wYWNpdHk9IjAuNTUiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSI0NSUiIHN0b3AtY29sb3I9IiMwMEI4RDkiIHN0b3Atb3BhY2l0eT0iMC4xMiIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMwMEI4RDkiIHN0b3Atb3BhY2l0eT0iMCIvPgogICAgPC9yYWRpYWxHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iYXduaW5nT3JhbmdlIiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNGRjhBMDAiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjRkY2QjAwIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJhd25pbmdXaGl0ZSIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjRkZGRkZGIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI0U4RUNGNSIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZmFjYWRlR3JhZCIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjRkZEMjFGIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI0ZGNkIwMCIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0id2luZG93R3JhZCIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMDBCOEQ5Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzA2M0I3MyIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZ2VhckdyYWQiIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI0ZGRDIxRiIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNGRjZCMDAiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImJhckdyYWQiIHgxPSIwIiB5MT0iMSIgeDI9IjAiIHkyPSIwIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI0ZGNkIwMCIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNGRkQyMUYiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9Im9uZUdyYWQiIHgxPSIwIiB5MT0iMCIgeDI9IjAiIHkyPSIxIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI0ZGRDIxRiIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNGRjZCMDAiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8ZmlsdGVyIGlkPSJzb2Z0U2hhZG93IiB4PSItNDAlIiB5PSItNDAlIiB3aWR0aD0iMTgwJSIgaGVpZ2h0PSIxODAlIj4KICAgICAgPGZlRHJvcFNoYWRvdyBkeD0iMCIgZHk9IjEwIiBzdGREZXZpYXRpb249IjE0IiBmbG9vZC1jb2xvcj0iIzA2MUI0NSIgZmxvb2Qtb3BhY2l0eT0iMC40NSIvPgogICAgPC9maWx0ZXI+CiAgICA8ZmlsdGVyIGlkPSJzbWFsbFNoYWRvdyIgeD0iLTYwJSIgeT0iLTYwJSIgd2lkdGg9IjIyMCUiIGhlaWdodD0iMjIwJSI+CiAgICAgIDxmZURyb3BTaGFkb3cgZHg9IjAiIGR5PSI0IiBzdGREZXZpYXRpb249IjYiIGZsb29kLWNvbG9yPSIjMDYxQjQ1IiBmbG9vZC1vcGFjaXR5PSIwLjM1Ii8+CiAgICA8L2ZpbHRlcj4KCiAgICA8Y2xpcFBhdGggaWQ9Imljb25DbGlwIj48cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iMTAyNCIgaGVpZ2h0PSIxMDI0IiByeD0iMjI0Ii8+PC9jbGlwUGF0aD4KICA8L2RlZnM+CiAgPGcgY2xpcC1wYXRoPSJ1cmwoI2ljb25DbGlwKSI+CiAgICA8IS0tID09PT09PT09PT09PT09PT09IGcjYmFja2dyb3VuZCA9PT09PT09PT09PT09PT09PSAtLT4KICAgIDxnIGlkPSJiYWNrZ3JvdW5kIj4KICAgICAgPHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjEwMjQiIGhlaWdodD0iMTAyNCIgZmlsbD0idXJsKCNiZ0dyYWQpIi8+CiAgICAgIDxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSIxMDI0IiBoZWlnaHQ9IjEwMjQiIGZpbGw9InVybCgjZ2xvd0dyYWQpIi8+CiAgICAgIDxwYXRoIGQ9Ik0gLTYwLDUxMiBBIDU2MCw1NjAgMCAwIDAgNjAsOTYwIiBmaWxsPSJub25lIiBzdHJva2U9IiMwMEQ5QTUiIHN0cm9rZS1vcGFjaXR5PSIwLjM1IiBzdHJva2Utd2lkdGg9IjM0Ii8+CiAgICA8L2c+CiAgICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxNjIgMTQ4KSBzY2FsZSgxKSI+CiAgICAgIAogIDxnIGlkPSJicmFuZE1hcmsiPgogICAgPCEtLSA9PT09PSBnI3N0b3JlIDogYm91dGlxdWUgKGF1dmVudCwgZmHDp2FkZSwgdml0cmluZSwgcG9ydGUpID09PT09IC0tPgogICAgPGcgaWQ9InN0b3JlIiBmaWx0ZXI9InVybCgjc29mdFNoYWRvdykiPgogICAgICA8IS0tIGJhbmRlYXUgaGF1dCBkZSBsJ2F1dmVudCAtLT4KICAgICAgPHJlY3QgeD0iODAiIHk9Ijg2IiB3aWR0aD0iNDgwIiBoZWlnaHQ9IjQ0IiByeD0iMTYiIGZpbGw9InVybCgjYXduaW5nT3JhbmdlKSIvPgogICAgICA8IS0tIGxhbWJyZXF1aW4gcmF5w6kgKHJheXVyZXMgb3JhbmdlIC8gYmxhbmMsIGJhcyBhcnJvbmRpIGZhw6dvbiBzdG9yZSBiYW5uZSkgLS0+CiAgICAgIDxnIGlkPSJhd25pbmctc3RyaXBlcyI+CiAgICAgICAgPHBhdGggZD0iTTgwLDEzMCBoNjggdjc4IHEwLDI2IC0zNCwyNiBxLTM0LDAgLTM0LC0yNiBaIiBmaWxsPSJ1cmwoI2F3bmluZ09yYW5nZSkiLz4KICAgICAgICA8cGF0aCBkPSJNMTQ4LDEzMCBoNjggdjg4IHEwLDI0IC0zNCwyNCBxLTM0LDAgLTM0LC0yNCBaIiBmaWxsPSJ1cmwoI2F3bmluZ1doaXRlKSIvPgogICAgICAgIDxwYXRoIGQ9Ik0yMTYsMTMwIGg2OCB2OTYgcTAsMjIgLTM0LDIyIHEtMzQsMCAtMzQsLTIyIFoiIGZpbGw9InVybCgjYXduaW5nT3JhbmdlKSIvPgogICAgICAgIDxwYXRoIGQ9Ik0yODQsMTMwIGg2OCB2OTYgcTAsMjIgLTM0LDIyIHEtMzQsMCAtMzQsLTIyIFoiIGZpbGw9InVybCgjYXduaW5nV2hpdGUpIi8+CiAgICAgICAgPHBhdGggZD0iTTM1MiwxMzAgaDY4IHY4OCBxMCwyNCAtMzQsMjQgcS0zNCwwIC0zNCwtMjQgWiIgZmlsbD0idXJsKCNhd25pbmdPcmFuZ2UpIi8+CiAgICAgICAgPHBhdGggZD0iTTQyMCwxMzAgaDY4IHY3OCBxMCwyNiAtMzQsMjYgcS0zNCwwIC0zNCwtMjYgWiIgZmlsbD0idXJsKCNhd25pbmdXaGl0ZSkiLz4KICAgICAgICA8cGF0aCBkPSJNNDg4LDEzMCBoNzIgdjcwIHEwLDI2IC0zNiwyNiBxLTM2LDAgLTM2LC0yNiBaIiBmaWxsPSJ1cmwoI2F3bmluZ09yYW5nZSkiLz4KICAgICAgPC9nPgogICAgICA8IS0tIGZhw6dhZGUgLS0+CiAgICAgIDxyZWN0IHg9IjEwOCIgeT0iMjMwIiB3aWR0aD0iNDIwIiBoZWlnaHQ9IjI4MCIgcng9IjE4IiBmaWxsPSJ1cmwoI2ZhY2FkZUdyYWQpIi8+CiAgICAgIDxyZWN0IHg9IjEwOCIgeT0iMjMwIiB3aWR0aD0iNDIwIiBoZWlnaHQ9IjI4MCIgcng9IjE4IiBmaWxsPSJub25lIiBzdHJva2U9IiMwNjFCNDUiIHN0cm9rZS1vcGFjaXR5PSIwLjE1IiBzdHJva2Utd2lkdGg9IjQiLz4KICAgICAgPCEtLSB2aXRyaW5lIGJsZXVlIGF2ZWMgcGFuaWVyIC0tPgogICAgICA8cmVjdCB4PSIxNTgiIHk9IjI3OCIgd2lkdGg9IjE5MCIgaGVpZ2h0PSIxNzYiIHJ4PSIxNCIgZmlsbD0idXJsKCN3aW5kb3dHcmFkKSIvPgogICAgICA8cmVjdCB4PSIxNTgiIHk9IjI3OCIgd2lkdGg9IjE5MCIgaGVpZ2h0PSIxNzYiIHJ4PSIxNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZGRkZGIiBzdHJva2Utb3BhY2l0eT0iMC4zNSIgc3Ryb2tlLXdpZHRoPSI0Ii8+CiAgICAgIDxnIGlkPSJiYXNrZXQiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIxMCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBmaWxsPSJub25lIj4KICAgICAgICA8cGF0aCBkPSJNMjIzLDM1MiBxMzAsLTQ2IDYwLDAiIC8+CiAgICAgICAgPHBhdGggZD0iTTIwMywzNTIgaDE2MCBsLTE2LDc4IHEtMywxNCAtMTgsMTQgaC05MiBxLTE1LDAgLTE4LC0xNCBaIiBmaWxsPSIjRkZGRkZGIiBzdHJva2U9Im5vbmUiLz4KICAgICAgICA8cGF0aCBkPSJNMjI4LDM2NiB2NTYgTTI1MywzNjYgdjYyIE0yNzgsMzY2IHY1NiIgc3Ryb2tlPSIjMDBCOEQ5IiBzdHJva2Utd2lkdGg9IjgiLz4KICAgICAgPC9nPgogICAgICA8IS0tIHBvcnRlIC0tPgogICAgICA8cmVjdCB4PSIzOTIiIHk9IjMyMiIgd2lkdGg9IjExMiIgaGVpZ2h0PSIxODgiIHJ4PSIxMCIgZmlsbD0iIzA2MUI0NSIvPgogICAgICA8Y2lyY2xlIGN4PSI0NzIiIGN5PSI0MTYiIHI9IjciIGZpbGw9IiNGRkQyMUYiLz4KICAgIDwvZz4KCiAgICA8IS0tID09PT09IGcjZ3Jvd3RoIDogZ3JhcGhpcXVlIGVuIGJhcnJlcyArIGZsw6hjaGUgYXNjZW5kYW50ZSA9PT09PSAtLT4KICAgIDxnIGlkPSJncm93dGgiPgogICAgICA8cmVjdCB4PSI1NDAiIHk9IjM2OCIgd2lkdGg9IjM0IiBoZWlnaHQ9IjkyIiByeD0iNiIgZmlsbD0idXJsKCNiYXJHcmFkKSIvPgogICAgICA8cmVjdCB4PSI1ODQiIHk9IjMzMCIgd2lkdGg9IjM0IiBoZWlnaHQ9IjEzMCIgcng9IjYiIGZpbGw9InVybCgjYmFyR3JhZCkiLz4KICAgICAgPHJlY3QgeD0iNjI4IiB5PSIyODYiIHdpZHRoPSIzNCIgaGVpZ2h0PSIxNzQiIHJ4PSI2IiBmaWxsPSJ1cmwoI2JhckdyYWQpIi8+CiAgICAgIDxwYXRoIGQ9Ik01NTYsMjcyIEw2NTAsMTc4IE02NTAsMTc4IGgtNDYgTTY1MCwxNzggdjQ2IiBmaWxsPSJub25lIiBzdHJva2U9IiNGRkQyMUYiIHN0cm9rZS13aWR0aD0iMTYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgogICAgPC9nPgoKICAgIDwhLS0gPT09PT0gZyNtYW5hZ2VtZW50IDogZW5ncmVuYWdlIChnZXN0aW9uKSA9PT09PSAtLT4KICAgIDxnIGlkPSJtYW5hZ2VtZW50IiBmaWx0ZXI9InVybCgjc21hbGxTaGFkb3cpIj4KICAgICAgPGcgZmlsbD0idXJsKCNnZWFyR3JhZCkiPgogICAgICAgIDxyZWN0IHg9Ii0xNS4wIiB5PSItMTA4LjAiIHdpZHRoPSIzMC4wIiBoZWlnaHQ9IjM0LjAiIHJ4PSI2IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg1NjAgNDgwKSByb3RhdGUoMC4wKSIvPgogICAgICA8cmVjdCB4PSItMTUuMCIgeT0iLTEwOC4wIiB3aWR0aD0iMzAuMCIgaGVpZ2h0PSIzNC4wIiByeD0iNiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNTYwIDQ4MCkgcm90YXRlKDM2LjApIi8+CiAgICAgIDxyZWN0IHg9Ii0xNS4wIiB5PSItMTA4LjAiIHdpZHRoPSIzMC4wIiBoZWlnaHQ9IjM0LjAiIHJ4PSI2IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg1NjAgNDgwKSByb3RhdGUoNzIuMCkiLz4KICAgICAgPHJlY3QgeD0iLTE1LjAiIHk9Ii0xMDguMCIgd2lkdGg9IjMwLjAiIGhlaWdodD0iMzQuMCIgcng9IjYiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDU2MCA0ODApIHJvdGF0ZSgxMDguMCkiLz4KICAgICAgPHJlY3QgeD0iLTE1LjAiIHk9Ii0xMDguMCIgd2lkdGg9IjMwLjAiIGhlaWdodD0iMzQuMCIgcng9IjYiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDU2MCA0ODApIHJvdGF0ZSgxNDQuMCkiLz4KICAgICAgPHJlY3QgeD0iLTE1LjAiIHk9Ii0xMDguMCIgd2lkdGg9IjMwLjAiIGhlaWdodD0iMzQuMCIgcng9IjYiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDU2MCA0ODApIHJvdGF0ZSgxODAuMCkiLz4KICAgICAgPHJlY3QgeD0iLTE1LjAiIHk9Ii0xMDguMCIgd2lkdGg9IjMwLjAiIGhlaWdodD0iMzQuMCIgcng9IjYiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDU2MCA0ODApIHJvdGF0ZSgyMTYuMCkiLz4KICAgICAgPHJlY3QgeD0iLTE1LjAiIHk9Ii0xMDguMCIgd2lkdGg9IjMwLjAiIGhlaWdodD0iMzQuMCIgcng9IjYiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDU2MCA0ODApIHJvdGF0ZSgyNTIuMCkiLz4KICAgICAgPHJlY3QgeD0iLTE1LjAiIHk9Ii0xMDguMCIgd2lkdGg9IjMwLjAiIGhlaWdodD0iMzQuMCIgcng9IjYiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDU2MCA0ODApIHJvdGF0ZSgyODguMCkiLz4KICAgICAgPHJlY3QgeD0iLTE1LjAiIHk9Ii0xMDguMCIgd2lkdGg9IjMwLjAiIGhlaWdodD0iMzQuMCIgcng9IjYiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDU2MCA0ODApIHJvdGF0ZSgzMjQuMCkiLz4KICAgICAgICA8Y2lyY2xlIGN4PSI1NjAiIGN5PSI0ODAiIHI9Ijg4IiAvPgogICAgICA8L2c+CiAgICAgIDxjaXJjbGUgY3g9IjU2MCIgY3k9IjQ4MCIgcj0iODgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLW9wYWNpdHk9IjAuMzUiIHN0cm9rZS13aWR0aD0iNCIvPgogICAgICA8Y2lyY2xlIGN4PSI1NjAiIGN5PSI0ODAiIHI9IjM0IiBmaWxsPSIjMDYxQjQ1Ii8+CiAgICA8L2c+CiAgPC9nPgoKICAgIDwvZz4KICA8L2c+Cjwvc3ZnPgo=";

function GestiOneIcon({ size = 76 }) {
  return (
    <img
      src={GESTIONE_ICON_DATA_URI}
      alt="GestiOne"
      width={size}
      height={size}
      style={{ width: size, height: size, minWidth: size, minHeight: size, display: "block", filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.25))" }}
    />
  );
}

// Bandeau animé de la page d'accueil : les vraies affiches de l'app défilent
// en fond, avec un glissement doux vers la gauche en boucle continue. Un
// dégradé sombre est posé sur la moitié basse de la photo pour que le badge,
// le titre et le sous-titre (superposés, façon page d'atterrissage) restent
// toujours lisibles quelle que soit l'image affichée.
const HERO_IMAGES = [
  "/hero/slide-1-controle.jpg",
  "/hero/slide-2-credits.jpg",
  "/hero/slide-3-scan.jpg",
  "/hero/slide-4-stock.jpg",
  "/hero/slide-5-equipe.jpg",
];
function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState("in"); // "in" | "out"

  useEffect(() => {
    setPhase("in");
    const t = setTimeout(() => setPhase("out"), 3400);
    return () => clearTimeout(t);
  }, [index]);

  useEffect(() => {
    if (phase !== "out") return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % HERO_IMAGES.length), 600);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div style={{ position: "relative", height: 340, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute", inset: 0,
          transition: "transform 0.6s ease, opacity 0.6s ease",
          transform: phase === "out" ? "translateX(-40px)" : "translateX(0)",
          opacity: phase === "out" ? 0 : 1,
        }}
      >
        <img src={HERO_IMAGES[index]} alt="" className="w-full h-full" style={{ objectFit: "cover", objectPosition: "top center" }} />
      </div>

      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(6,27,69,0.95) 0%, rgba(6,27,69,0.75) 34%, rgba(6,27,69,0.15) 62%, transparent 80%)" }} />

      <div style={{ position: "absolute", left: 20, right: 20, bottom: 16 }}>
        <span style={{ display: "inline-block", border: "1px solid var(--cap)", color: "var(--cap)", fontSize: 10, fontWeight: 700, padding: "4px 11px", borderRadius: 999, marginBottom: 10, letterSpacing: "0.04em" }}>GESTION</span>
        <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2, color: "#fff", margin: "0 0 8px" }}>
          Ton entreprise, <span style={{ color: "var(--cap)" }}>sous contrôle</span>
        </h1>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", lineHeight: 1.5, margin: "0 0 12px" }}>
          Vente, stock, inventaire, crédits et équipe — tout en une application GestiOne
        </p>
        <div className="flex gap-1.5">
          {HERO_IMAGES.map((_, i) => (
            <span key={i} className="rounded-full" style={{ width: i === index ? 16 : 5, height: 5, background: i === index ? "var(--cap)" : "rgba(255,255,255,0.35)", transition: "width .25s ease" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Rangée de 3 statistiques affichée sous le carrousel — repère rapide de ce
// que l'app offre, dans le même esprit que les pages d'atterrissage produit.
function HeroStats() {
  const stats = [
    { value: `${TRIAL_DAYS}j`, label: "essai gratuit" },
    { value: "100%", label: "hors-ligne" },
    { value: "Sécurisé", label: "code d'accès" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 px-6 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.1)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
      {stats.map((s) => (
        <div key={s.label} className="text-center">
          <p className="font-display font-bold text-white" style={{ fontSize: 17 }}>{s.value}</p>
          <p className="text-white/55" style={{ fontSize: 10, marginTop: 3 }}>{s.label}</p>
        </div>
      ))}
    </div>
  );
}


/* ---------- Domaine ---------- */

const ICON_OPTIONS = [
  { id: "beer", Icon: Beer },
  { id: "cupsoda", Icon: CupSoda },
  { id: "droplets", Icon: Droplets },
  { id: "citrus", Icon: Citrus },
  { id: "wine", Icon: Wine },
  { id: "martini", Icon: Martini },
  { id: "coffee", Icon: Coffee },
  { id: "milk", Icon: Milk },
  { id: "glasswater", Icon: GlassWater },
  { id: "croissant", Icon: Croissant },
  { id: "cookie", Icon: Cookie },
  { id: "popcorn", Icon: Popcorn },
];
const ICON_MAP = Object.fromEntries(ICON_OPTIONS.map((o) => [o.id, o.Icon]));
const COLOR_OPTIONS = ["#E8A33D", "#2C7DA0", "#3FB8C4", "#E76F3C", "#8B5CF6", "#EC4899", "#22C55E", "#14B8A6"];

const SEED_CATEGORIES = [
  { id: "biere", label: "Bière", color: "#E8A33D", icon: "beer" },
  { id: "soda", label: "Soda", color: "#2C7DA0", icon: "cupsoda" },
  { id: "eau", label: "Eau", color: "#3FB8C4", icon: "droplets" },
  { id: "jus", label: "Jus", color: "#E76F3C", icon: "citrus" },
];
function getCategory(categories, id) {
  return (categories || []).find((c) => c.id === id) || { id, label: id || "?", color: "#999999", icon: "beer" };
}

const SEED_PRODUCTS = [
  { id: "1", name: "Régab 65cl", barcode: "6291041500213", category: "biere", price: 1200, costPrice: 900, stock: 48, openingStock: 48, minStock: 12, unit: "bouteille", favorite: true },
  { id: "2", name: "Castel Beer 65cl", barcode: "6291041500220", category: "biere", price: 1100, costPrice: 850, stock: 36, openingStock: 36, minStock: 12, unit: "bouteille" },
  { id: "3", name: "Coca-Cola 33cl", barcode: "5449000000996", category: "soda", price: 600, costPrice: 400, stock: 60, openingStock: 60, minStock: 20, unit: "canette", favorite: true },
  { id: "4", name: "Fanta Orange 33cl", barcode: "5449000133328", category: "soda", price: 600, costPrice: 400, stock: 8, openingStock: 8, minStock: 20, unit: "canette" },
  { id: "5", name: "Sprite 33cl", barcode: "5449000131836", category: "soda", price: 600, costPrice: 400, stock: 42, openingStock: 42, minStock: 20, unit: "canette" },
  { id: "6", name: "Eau Andza 1.5L", barcode: "6291041500237", category: "eau", price: 500, costPrice: 300, stock: 70, openingStock: 70, minStock: 24, unit: "bouteille" },
  { id: "7", name: "Eau Vitalo 50cl", barcode: "6291041500244", category: "eau", price: 300, costPrice: 180, stock: 15, openingStock: 15, minStock: 24, unit: "bouteille" },
  { id: "8", name: "Jus Youki Ananas 1L", barcode: "6291041500251", category: "jus", price: 1500, costPrice: 1000, stock: 20, openingStock: 20, minStock: 10, unit: "brique" },
];
const SEED_SUPPLIERS = [
  { id: "s1", name: "Sobraga (brasserie)", phone: "+241 01 23 45 67", note: "Bières & sodas" },
  { id: "s2", name: "Distributeur Eaux locales", phone: "+241 07 65 43 21", note: "Eaux minérales" },
];

const DEFAULT_ADMIN_PIN = "1234";
const PAYMENT_METHODS = [
  { id: "especes", label: "Espèces" },
  { id: "mobile", label: "Mobile Money" },
  { id: "credit", label: "Crédit client" },
];
const PAYMENT_LABELS = { especes: "Espèces", mobile: "Mobile Money", credit: "Crédit client" };
// Historique des paiements réels d'une vente à crédit — nécessaire pour que
// la recette du jour compte chaque remboursement (même partiel) à sa vraie
// date d'encaissement, pas à la date de la vente. Les ventes réglées avant
// l'existence des paiements partiels (un seul règlement total) sont lues
// comme un paiement unique à la date d'encaissement déjà enregistrée.
function creditPaymentsOf(sale) {
  if (Array.isArray(sale.payments)) return sale.payments;
  if (sale.paid && sale.paidDate) return [{ amount: sale.total, date: sale.paidDate, by: sale.paidBy }];
  return [];
}
function creditPaidSoFar(sale) {
  return creditPaymentsOf(sale).reduce((sum, p) => sum + p.amount, 0);
}
const PAYMENT_COLORS = { especes: "var(--glass)", mobile: "var(--soda)", credit: "var(--danger)" };

const MOVEMENT_TYPES = {
  vente: { label: "Vente", color: "var(--danger)" },
  creation: { label: "Création produit", color: "var(--soda)" },
  ajustement: { label: "Ajustement manuel", color: "var(--cap)" },
  comptage: { label: "Comptage d'inventaire", color: "#8B5CF6" },
  retour: { label: "Retour client", color: "#0F6E56" },
};

// Réglages de l'entreprise partagés entre tous les appareils (clé shopMeta).
// Un champ absent de cette liste reste sur le téléphone où il a été réglé.
const SHOP_META_SYNC_FIELDS = [
  "name", "type", "currency", "adminPinHash", "adminDisplayName", "theme", "darkMode", "soundsEnabled",
  "voiceNotificationsEnabled", "loyaltyThreshold", "language", "cashRegisterResetHour",
  // Sécurité
  "autoLockMinutes", "protectSensitive",
  // Facturation
  "taxId", "rccm", "invoiceAddress", "invoicePhone", "invoiceEmail", "vatRate", "invoiceFooter",
  // Équipe
  "vendorGoals",
];
function pickShopMeta(shop) {
  const out = {};
  SHOP_META_SYNC_FIELDS.forEach((k) => { if (shop && shop[k] !== undefined) out[k] = shop[k]; });
  return out;
}

const ESTABLISHMENT_TYPES = [
  { id: "maquis", label: "Maquis" },
  { id: "cave", label: "Cave" },
  { id: "buvette", label: "Buvette" },
  { id: "bar", label: "Bar" },
  { id: "autre", label: "Autre" },
];

const CURRENCIES = [
  { code: "XAF", label: "Franc CFA (XAF)", symbol: "FCFA", locale: "fr-FR" },
  { code: "EUR", label: "Euro (EUR)", symbol: "€", locale: "fr-FR" },
  { code: "USD", label: "Dollar US (USD)", symbol: "$", locale: "en-US" },
  { code: "GBP", label: "Livre Sterling (GBP)", symbol: "£", locale: "en-GB" },
  { code: "CAD", label: "Dollar canadien (CAD)", symbol: "$", locale: "fr-CA" },
];

const THEME_PRESETS = [
  { id: "emeraude", label: "Émeraude", glass: "#0E3B2A", glassLight: "#175943", cap: "#E8A33D" },
  { id: "ocean", label: "Océan", glass: "#0B3B5C", glassLight: "#12557E", cap: "#5FD1F2" },
  { id: "rubis", label: "Rubis", glass: "#5C1A2B", glassLight: "#7A2438", cap: "#F2A65A" },
  { id: "ambre", label: "Ambre", glass: "#4A2E12", glassLight: "#6B451E", cap: "#F2C14E" },
  { id: "violet", label: "Violet", glass: "#2E1A47", glassLight: "#432764", cap: "#C9A6FF" },
  { id: "ardoise", label: "Ardoise", glass: "#1E2A32", glassLight: "#2C3E49", cap: "#7FD1D9" },
];
function getTheme(id) { return THEME_PRESETS.find((t) => t.id === id) || THEME_PRESETS[0]; }

/* ---------- Licence / activation ---------- */

const ACTIVATION_PLANS = [
  { code: "01", id: "1m", label: "1 mois", days: 30 },
  { code: "03", id: "3m", label: "3 mois", days: 90 },
  { code: "06", id: "6m", label: "6 mois", days: 180 },
  { code: "12", id: "12m", label: "12 mois", days: 365 },
  { code: "99", id: "lifetime", label: "À vie", days: null },
];
const TRIAL_DAYS = 14;
const MS_DAY = 24 * 60 * 60 * 1000;
// Objet licence "essai gratuit" standard, attribué automatiquement à toute
// nouvelle entreprise dès sa création (première entreprise ou entreprise
// supplémentaire) — pas besoin d'une action séparée pour démarrer l'essai.
function makeTrialLicense() {
  return { code: null, planId: "trial", lifetime: false, activatedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + TRIAL_DAYS * MS_DAY).toISOString() };
}
const OWNER_EMAIL = "ayekoe83@gmail.com";
const OWNER_SECURITY_QUESTION = "Dans quelle école primaire as-tu étudié ?";

function luhnCheckDigit(digits) {
  let sum = 0, alt = true;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  const mod = sum % 10;
  return mod === 0 ? 0 : 10 - mod;
}
function formatActivationInput(raw) {
  const digits = raw.replace(/\D/g, "").slice(0, 12);
  return digits.replace(/(.{4})/g, "$1-").replace(/-$/, "");
}
function validateActivationCode(raw) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 12) return { ok: false, error: "Le code doit contenir 12 chiffres." };
  const plan = ACTIVATION_PLANS.find((p) => p.code === digits.slice(0, 2));
  if (!plan) return { ok: false, error: "Code invalide (plan inconnu)." };
  const base = digits.slice(0, 11);
  const check = digits.slice(11);
  if (String(luhnCheckDigit(base)) !== check) return { ok: false, error: "Code invalide (vérifiez la saisie)." };
  return { ok: true, plan, digits };
}
function computeLicenseStatus(license) {
  if (!license) return "none";
  if (license.lifetime) return "lifetime";
  if (!license.expiresAt) return "none";
  const daysLeft = Math.ceil((new Date(license.expiresAt) - Date.now()) / MS_DAY);
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 5) return "expiring";
  return "active";
}

const CurrencyContext = createContext("XAF");

/* ---------- Langue ---------- */

const LanguageContext = createContext("fr");
const TRANSLATIONS = {
  fr: {
    sell: "Vendre", stock: "Stock", credits: "Crédits", history: "Historique", admin: "Admin", expenses: "Dépenses",
    myHistory: "Mes ventes", fullHistory: "Historique des ventes", administration: "Administration",
    vendor: "Vendeur", administrator: "Administrateur", cancel: "Annuler", save: "Enregistrer",
    add: "Ajouter", edit: "Modifier", delete: "Supprimer", close: "Fermer",
    creditWord: "Crédit", avoirWord: "Avoir",
  },
  en: {
    sell: "Sell", stock: "Stock", credits: "Credits", history: "History", admin: "Admin", expenses: "Expenses",
    myHistory: "My Sales", fullHistory: "Sales History", administration: "Administration",
    vendor: "Vendor", administrator: "Administrator", cancel: "Cancel", save: "Save",
    add: "Add", edit: "Edit", delete: "Delete", close: "Close",
    creditWord: "Credit", avoirWord: "Store credit",
  },
};
function useT() {
  const lang = useContext(LanguageContext);
  return (key) => (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || TRANSLATIONS.fr[key] || key;
}

function formatMoney(n, currencyCode) {
  const meta = CURRENCIES.find((c) => c.code === currencyCode) || CURRENCIES[0];
  return new Intl.NumberFormat(meta.locale).format(Math.round(n || 0)) + " " + meta.symbol;
}
function useFmt() {
  const currency = useContext(CurrencyContext);
  return (n) => formatMoney(n, currency);
}
function buildReceiptText(receipt, shop, fmt) {
  const lines = [];
  lines.push(`🧾 Reçu de vente — ${shop.name}`);
  lines.push(new Date(receipt.date).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }));
  lines.push("");
  receipt.items.forEach((i) => {
    lines.push(`${i.qty} × ${i.product.name} — ${fmt(computeItemTotal(i.product, i.qty))}`);
  });
  lines.push("");
  lines.push(`Total : ${fmt(receipt.total)}`);
  lines.push(`Paiement : ${PAYMENT_LABELS[receipt.paymentMethod]}`);
  if (receipt.paymentMethod === "credit" && receipt.clientName) lines.push(`Client : ${receipt.clientName}`);
  if (receipt.amountReceived != null) {
    lines.push(`Montant reçu : ${fmt(receipt.amountReceived)}`);
    lines.push(`Monnaie rendue : ${fmt(receipt.changeDue)}`);
  }
  lines.push("");
  lines.push("Merci pour votre confiance. À très bientôt !");
  return lines.join("\n");
}

function useCurrencySymbol() {
  const currency = useContext(CurrencyContext);
  return (CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0]).symbol;
}

const uid = () => Math.random().toString(36).slice(2, 10);
// Numéro de reçu 100% numérique dérivé de l'id interne (base36) — permet
// d'afficher/imprimer/scanner des numéros de reçu composés uniquement de
// chiffres, sans avoir à changer le format des id internes utilisés partout
// ailleurs comme clé. Déterministe : le même id donne toujours le même numéro.
function receiptNumber(id) {
  if (!id) return "";
  const clean = String(id).replace(/[^a-z0-9]/gi, "");
  const n = parseInt(clean, 36);
  const digits = Number.isFinite(n) ? String(n) : clean.replace(/\D/g, "");
  return digits.slice(-9).padStart(6, "0");
}
// Initiales pour les avatars ronds des listes clients (crédits, avoirs).
function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
// Filtre par période partagé (Aujourd'hui / 7 jours / 30 jours / plage
// personnalisée), même logique que le filtre déjà utilisé dans l'historique
// des ventes — réutilisé ici pour les écrans Crédits et Avoirs.
function inPeriod(dateStr, period, customFrom, customTo) {
  if (!period || period === "all") return true;
  const d = new Date(dateStr);
  if (period === "today") return d.toDateString() === new Date().toDateString();
  if (period === "7j") { const from = new Date(); from.setDate(from.getDate() - 7); return d >= from; }
  if (period === "30j") { const from = new Date(); from.setDate(from.getDate() - 30); return d >= from; }
  if (period === "custom") {
    if (customFrom && d < new Date(customFrom + "T00:00:00")) return false;
    if (customTo && d > new Date(customTo + "T23:59:59")) return false;
    return true;
  }
  return true;
}
const PERIOD_FILTER_OPTIONS = [
  { id: "all", label: "Tout" },
  { id: "today", label: "Aujourd'hui" },
  { id: "7j", label: "7 jours" },
  { id: "30j", label: "30 jours" },
  { id: "custom", label: "Plage", Icon: CalendarCheck },
];
// Chips de période + champs de dates personnalisées, réutilisés tels quels
// dans CreditsScreen et AvoirsScreen.
function PeriodFilterBar({ value, onChange, customFrom, customTo, onCustomFrom, onCustomTo }) {
  return (
    <>
      <div className="flex gap-2 overflow-x-auto gb-scroll mb-3">
        {PERIOD_FILTER_OPTIONS.map((p) => (
          <button key={p.id} onClick={() => onChange(p.id)} className="gb-focus shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold" style={{ background: value === p.id ? "#0F6E56" : "var(--card)", color: value === p.id ? "#fff" : "var(--ink)", border: value === p.id ? "none" : "1px solid var(--line)" }}>
            {p.Icon && <p.Icon size={12} />}{p.label}
          </button>
        ))}
      </div>
      {value === "custom" && (
        <div className="flex items-center gap-2 mb-4 p-2.5 rounded-xl gb-slide-up" style={{ background: "#E1F5EE" }}>
          <input type="date" value={customFrom} onChange={(e) => onCustomFrom(e.target.value)} className="gb-focus flex-1 rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "#9FE1CB", background: "var(--card)" }} />
          <span className="text-xs font-semibold" style={{ color: "#0F6E56" }}>à</span>
          <input type="date" value={customTo} onChange={(e) => onCustomTo(e.target.value)} className="gb-focus flex-1 rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "#9FE1CB", background: "var(--card)" }} />
        </div>
      )}
    </>
  );
}
const JOIN_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function generateShopJoinCode(length = 7) {
  let out = "";
  for (let i = 0; i < length; i++) out += JOIN_CODE_ALPHABET[Math.floor(Math.random() * JOIN_CODE_ALPHABET.length)];
  return out;
}

function computeItemTotal(product, qty) {
  if (product.bulkQty > 0 && product.bulkPrice > 0 && qty >= product.bulkQty) {
    const lots = Math.floor(qty / product.bulkQty);
    const remainder = qty % product.bulkQty;
    return lots * product.bulkPrice + remainder * product.price;
  }
  return qty * product.price;
}

/* ---------- Retours produits ---------- */

// Un retour est enregistré SUR la vente d'origine (sale.returns) : les
// quantités rendues sont retirées de la vente, son total baisse d'autant et
// chaque retour garde sa trace (date, articles, motif, remboursement).
const RETURN_REASONS = ["Produit défectueux", "Erreur de vente", "Client a changé d'avis", "Produit périmé", "Autre"];
const RETURN_NO_RESTOCK_REASONS = ["Produit défectueux", "Produit périmé"];
const REFUND_LABELS = { especes: "Espèces", mobile: "Mobile Money", avoir: "Avoir client", credit: "Déduit du crédit" };
function saleReturnsOf(sale) { return Array.isArray(sale?.returns) ? sale.returns : []; }
function returnedAmountOf(sale) { return saleReturnsOf(sale).reduce((t, r) => t + (Number(r.amount) || 0), 0); }

/* ---------- Fiche de stock (stock de départ, arrivages, ventes) ---------- */

// Mouvements "ajustement" générés automatiquement par la suppression ou la
// modification d'une vente : la vente elle-même porte déjà l'information,
// on ne les compte donc pas une deuxième fois comme ajustement manuel.
const SALE_ADJUST_NOTES = ["Suppression de vente", "Modification de vente"];

// Reconstitue l'historique du stock d'un produit depuis son stock de départ :
//   stock actuel = stock de départ + arrivages ± ajustements − ventes
// - Le stock de départ est figé à une date (création du produit ou dernier
//   inventaire validé) et ne bouge plus ensuite.
// - Chaque arrivage fournisseur validé est une ligne datée (stock avant,
//   quantité reçue, nouveau stock).
// - Les ventes viennent des ventes réellement enregistrées.
// `ecart` = stock réel − stock calculé (0 quand tout est cohérent).
function buildStockLedger(product, { sales = [], movements = [], inventories = [] } = {}) {
  const pid = product.id;
  const time = (d) => new Date(d).getTime() || 0;
  const lastInventoryTime = inventories.reduce((max, inv) => Math.max(max, time(inv.date)), 0);
  const creation = movements.find((m) => m.productId === pid && m.type === "creation");
  const refTime = product.openingStockDate ? time(product.openingStockDate) : Math.max(lastInventoryTime, creation ? time(creation.date) : 0);
  const opening = Number(product.openingStock ?? product.stock) || 0;

  const after = (d) => time(d) > refTime;
  const arrivals = movements
    .filter((m) => m.productId === pid && m.type === "livraison" && after(m.date))
    .map((m) => ({ kind: "arrivage", date: m.date, qty: Number(m.delta) || 0, before: m.before, after: m.after, note: m.note, author: m.author }));
  const adjustments = movements
    .filter((m) => m.productId === pid && (m.type === "ajustement" || m.type === "comptage") && !SALE_ADJUST_NOTES.includes(m.note) && after(m.date))
    .map((m) => ({ kind: m.type === "comptage" ? "comptage" : "ajustement", date: m.date, qty: Number(m.delta) || 0, before: m.before, after: m.after, note: m.note, author: m.author }));

  // Retours clients : la vente d'origine a déjà été diminuée des quantités
  // rendues (donc « vendus » baisse). On corrige seulement les cas où le
  // stock physique ne suit pas : article non remis en stock (défectueux), ou
  // retour d'une vente antérieure au stock de départ.
  const returns = movements
    .filter((m) => m.productId === pid && m.type === "retour" && after(m.date))
    .map((m) => ({ kind: "retour", date: m.date, qty: Number(m.qty) || 0, restocked: !!m.restocked, saleCounted: m.saleDate ? after(m.saleDate) : true, note: m.note, author: m.author, before: m.before, after: m.after }));
  const returnAdj = returns.reduce((t, r) => t + (r.saleCounted ? (r.restocked ? 0 : -r.qty) : (r.restocked ? r.qty : 0)), 0);

  let sold = 0, revenue = 0, cost = 0, saleCount = 0, firstSale = null, lastSale = null;
  sales.forEach((s) => {
    if (!after(s.date)) return;
    (s.items || []).forEach((it) => {
      if ((it.product?.id || it.id) !== pid) return;
      const qty = Number(it.qty) || 0;
      sold += qty;
      revenue += it.product ? computeItemTotal({ ...it.product, price: Number(it.product.price) || 0 }, qty) : 0;
      const snapCost = Number(it.product?.costPrice) || 0;
      cost += qty * (snapCost > 0 ? snapCost : Number(product.costPrice) || 0);
      saleCount += 1;
      if (!firstSale || time(s.date) < time(firstSale)) firstSale = s.date;
      if (!lastSale || time(s.date) > time(lastSale)) lastSale = s.date;
    });
  });

  const arrived = arrivals.reduce((s, a) => s + a.qty, 0);
  const adjusted = adjustments.reduce((s, a) => s + a.qty, 0);
  const expected = opening + arrived + adjusted + returnAdj - sold;
  const current = Number(product.stock) || 0;
  return {
    openingDate: refTime ? new Date(refTime).toISOString() : null,
    opening, arrivals, arrived, adjustments, adjusted, returns, returnAdj,
    sold, saleCount, firstSale, lastSale, revenue, cost,
    expected, current, ecart: current - expected,
  };
}

/* ---------- Retours sonores ---------- */

let gbSynth = null;
async function playSound(kind, enabled) {
  if (!enabled) return;
  try {
    await Tone.start();
    if (!gbSynth) gbSynth = new Tone.Synth({ oscillator: { type: "sine" }, volume: -14 }).toDestination();
    const now = Tone.now();
    if (kind === "add") {
      gbSynth.triggerAttackRelease("C6", 0.06, now);
    } else if (kind === "sale") {
      gbSynth.triggerAttackRelease("C5", 0.08, now);
      gbSynth.triggerAttackRelease("E5", 0.08, now + 0.09);
      gbSynth.triggerAttackRelease("G5", 0.12, now + 0.18);
    } else if (kind === "error") {
      gbSynth.triggerAttackRelease("F3", 0.14, now);
    }
  } catch { /* audio indisponible (ex: avant interaction utilisateur) — on ignore */ }
}

// Annonce vocale — utilisée pour le scan de reçu (crédit/avoir en cours), le
// rappel quotidien de stock bas, et le rappel de licence proche de
// l'expiration. Contrôlée par un seul interrupteur global
// (shop.voiceNotificationsEnabled).
//
// IMPORTANT : passe par le plugin @capacitor-community/text-to-speech,
// PAS par window.speechSynthesis (l'API web standard) — cette dernière
// est souvent absente ou muette dans la webview Android de Capacitor,
// même si elle fonctionne dans un vrai navigateur Chrome. C'est le même
// type de piège que pour l'impression Bluetooth (une API web qui existe
// mais que la webview native ne relie à rien de fonctionnel). Ce plugin,
// lui, passe par le vrai moteur TextToSpeech d'Android.
//
// INSTALLATION REQUISE (à faire une fois, côté projet) :
//   npm install @capacitor-community/text-to-speech
//   npx cap sync
//
// ATTENTION : la disponibilité et la qualité des voix françaises dépendent
// tout de même du moteur TTS installé sur le téléphone (souvent Google TTS
// sur Android, à activer/télécharger dans les réglages du téléphone si ce
// n'est pas déjà fait) — non testable depuis cet environnement, à valider
// sur l'appareil réel.
// Convertit un montant déjà formaté pour l'écran (ex : "15 000 FCFA") en
// version prononçable — les synthèses vocales lisent "FCFA" lettre par
// lettre ou de façon incompréhensible ; "francs" se dit naturellement.
// Utiliser UNIQUEMENT pour le texte envoyé à speak(), jamais pour l'affichage.
function spokenAmount(formatted) {
  return String(formatted)
    .replace(/FCFA/g, "francs")
    .replace(/€/g, "euros")
    .replace(/\$/g, "dollars")
    .replace(/£/g, "livres");
}

// ---------- Notifications vocales : réglage PAR APPAREIL ----------
// Avant, un seul interrupteur global (shop.voiceNotificationsEnabled) réglé
// par l'administrateur, et plusieurs annonces n'étaient faites que sur son
// appareil. Maintenant chaque personne connectée (vendeuse, vendeur ou
// administrateur) active la voix sur SON téléphone et choisit les actions
// annoncées. Tant qu'un appareil n'a rien choisi, il suit l'ancien réglage
// global de l'entreprise.
const VOICE_EVENT_TYPES = [
  { id: "sale", label: "Ventes", desc: "Chaque vente et son montant", bg: "#E4F4EA", fg: "#1E8E50" },
  { id: "cancel", label: "Annulations et modifications", desc: "Vente supprimée ou modifiée", bg: "#FBE4E1", fg: "#B3261E" },
  { id: "credit", label: "Crédits et avoirs", desc: "Crédit encaissé, avoir créé ou rendu", bg: "#EEE7FB", fg: "#5B3A9E" },
  { id: "stock", label: "Stock bas et ruptures", desc: "Produit sous le seuil d'alerte", bg: "#FFF1D6", fg: "#B45F06" },
  { id: "movement", label: "Entrées et ajustements de stock", desc: "Réception, inventaire, correction", bg: "#E0F1F6", fg: "#1B7A93" },
  { id: "order", label: "Commandes fournisseur", desc: "Commande créée, modifiée, reçue", bg: "#E6EEFA", fg: "#1D4E89" },
  { id: "expense", label: "Dépenses", desc: "Nouvelle dépense enregistrée", bg: "#FCEEDB", fg: "#8A4B00" },
  { id: "cash", label: "Caisse et versements", desc: "Fond de caisse saisi, versement fait", bg: "#EDEBE5", fg: "#3D4550" },
  { id: "license", label: "Licence et rappels", desc: "Licence bientôt expirée", bg: "#F6F5F1", fg: "#4A525C" },
];
function voicePrefsStorageKey(shopId) { return `voicePrefs:${shopId || "default"}`; }
function defaultVoiceTypes() { const t = {}; VOICE_EVENT_TYPES.forEach((e) => { t[e.id] = true; }); return t; }
function readVoicePrefs(shop) {
  try {
    const raw = localStorage.getItem(voicePrefsStorageKey(shop?.id));
    if (raw) {
      const p = JSON.parse(raw);
      return { enabled: !!p.enabled, volume: Math.min(1, Math.max(0.1, Number(p.volume) || 1)), types: { ...defaultVoiceTypes(), ...(p.types || {}) }, custom: true };
    }
  } catch { /* stockage indisponible */ }
  return { enabled: !!shop?.voiceNotificationsEnabled, volume: 1, types: defaultVoiceTypes(), custom: false };
}
function writeVoicePrefs(shop, prefs) {
  try { localStorage.setItem(voicePrefsStorageKey(shop?.id), JSON.stringify({ enabled: !!prefs.enabled, volume: prefs.volume, types: prefs.types })); } catch { /* ignore */ }
}
// Renvoie true si l'annonce de ce type doit être dite sur CET appareil.
function voiceOn(shop, type) {
  const p = readVoicePrefs(shop);
  if (!p.enabled) return false;
  return type ? p.types[type] !== false : true;
}
let voiceVolume = 1;

async function speak(text, enabled) {
  if (!enabled) return;
  try {
    const { TextToSpeech } = await import("@capacitor-community/text-to-speech");
    await TextToSpeech.speak({ text, lang: "fr-FR", rate: 1.0, volume: voiceVolume, category: "playback" });
    return;
  } catch {
    // Repli navigateur (aperçu web hors app native) : l'API standard, qui
    // fonctionne correctement dans un vrai navigateur.
    try {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "fr-FR";
        utter.volume = voiceVolume;
        window.speechSynthesis.speak(utter);
      }
    } catch { /* synthèse vocale indisponible sur cet appareil */ }
  }
}

async function loadKey(key, seed) {
  try {
    const r = await window.storage.get(key);
    return JSON.parse(r.value);
  } catch {
    window.storage.set(key, JSON.stringify(seed)).catch(() => {});
    return seed;
  }
}
async function safeDelete(key) {
  try { await window.storage.delete(key); } catch { /* clé déjà absente */ }
}
// Licence stockée PAR ENTREPRISE — avant, une seule clé "license" servait pour
// tout l'appareil, donc passer d'une entreprise à l'autre (handleSwitchShop)
// gardait affichée la licence de l'entreprise précédente : une entreprise dont
// la licence avait expiré restait accessible tant qu'on ne relançait pas
// l'app dessus. Avec `license:${shopId}`, chaque entreprise a son propre état
// local, rechargé explicitement à chaque changement d'entreprise.
async function loadLocalLicense(shopId) {
  try { const r = await window.storage.get(`license:${shopId}`); return JSON.parse(r.value); } catch { return null; }
}
// Recompresse une image déjà stockée (dataURL) — utilisé comme filet de
// sécurité pour les photos produit enregistrées avant l'introduction de la
// compression automatique, qui pouvaient peser plusieurs Mo et faire
// dépasser la limite de 5 Mo par clé de stockage.
function recompressDataUrl(dataUrl, maxDim = 480, quality = 0.65) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = reject;
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = dataUrl;
  });
}
async function loadShopData(shopId) {
  const [products, sales, vendors, suppliers, expenses, categories, movements, inventories, clients, orders, supplierProducts, avoirs, cashRegisterEntries, versements] = await Promise.all([
    loadKey(`products:${shopId}`, SEED_PRODUCTS),
    loadKey(`sales:${shopId}`, []),
    loadKey(`vendors:${shopId}`, []),
    loadKey(`suppliers:${shopId}`, SEED_SUPPLIERS),
    loadKey(`expenses:${shopId}`, []),
    loadKey(`categories:${shopId}`, SEED_CATEGORIES),
    loadKey(`movements:${shopId}`, []),
    loadKey(`inventories:${shopId}`, []),
    loadKey(`clients:${shopId}`, []),
    loadKey(`orders:${shopId}`, []),
    loadKey(`supplierProducts:${shopId}`, []),
    loadKey(`avoirs:${shopId}`, []),
    loadKey(`cashRegisterEntries:${shopId}`, []),
    loadKey(`versements:${shopId}`, []),
  ]);
  return { products, sales, vendors, suppliers, expenses, categories, movements, inventories, clients, orders, supplierProducts, avoirs, cashRegisterEntries: ownCashEntries(cashRegisterEntries, shopId), versements: ownCashEntries(versements, shopId) };
}
async function seedShopData(shopId, vendor) {
  await Promise.all([
    window.storage.set(`products:${shopId}`, JSON.stringify(SEED_PRODUCTS)),
    window.storage.set(`sales:${shopId}`, JSON.stringify([])),
    window.storage.set(`vendors:${shopId}`, JSON.stringify(vendor ? [vendor] : [])),
    window.storage.set(`suppliers:${shopId}`, JSON.stringify(SEED_SUPPLIERS)),
    window.storage.set(`expenses:${shopId}`, JSON.stringify([])),
    window.storage.set(`categories:${shopId}`, JSON.stringify(SEED_CATEGORIES)),
    window.storage.set(`movements:${shopId}`, JSON.stringify([])),
    window.storage.set(`inventories:${shopId}`, JSON.stringify([])),
    window.storage.set(`clients:${shopId}`, JSON.stringify([])),
    window.storage.set(`orders:${shopId}`, JSON.stringify([])),
    window.storage.set(`supplierProducts:${shopId}`, JSON.stringify([])),
    window.storage.set(`avoirs:${shopId}`, JSON.stringify([])),
    window.storage.set(`cashRegisterEntries:${shopId}`, JSON.stringify([])),
    window.storage.set(`versements:${shopId}`, JSON.stringify([])),
  ]).catch(() => {});
}

// Une entreprise ne doit apparaître qu'une seule fois dans la liste, même si
// elle a été ajoutée deux fois (ex : reconnexion à une entreprise déjà
// présente sur l'appareil). Fusionne les doublons par identifiant, en gardant
// la position de la première occurrence et les informations les plus récentes.
function uniqueShops(list) {
  const byId = new Map();
  (list || []).forEach((s) => {
    if (!s || !s.id) return;
    byId.set(s.id, { ...(byId.get(s.id) || {}), ...s });
  });
  return Array.from(byId.values());
}

// Fond de caisse : chaque entreprise a SA caisse. On ne garde que les
// montants qui appartiennent explicitement à l'entreprise donnée — ceux d'une
// autre entreprise (copiés par erreur lors d'un changement d'entreprise) ou
// sans entreprise précisée sont ignorés, pour qu'un montant saisi dans une
// boutique ne vaille jamais pour une autre.
function ownCashEntries(list, shopId) {
  if (!Array.isArray(list) || !shopId) return [];
  return list.filter((e) => e && e.shopId === shopId);
}

// ---------- Caisse : sessions et versements ----------
// Une "session de caisse" commence quand on saisit le fond de caisse et reste
// OUVERTE jusqu'au versement suivant — même si la journée change. Tant
// qu'elle est ouverte, la fenêtre du fond de caisse ne réapparaît pas. Dès
// qu'un versement la clôture, la fenêtre revient pour saisir ce qui reste
// dans la caisse, ce qui ouvre la session suivante.
function cashTime(d) { return new Date(d).getTime() || 0; }
function sortedCashSessions(entries, shopId) {
  return ownCashEntries(entries, shopId).slice().sort((a, b) => cashTime(a.timestamp || a.date) - cashTime(b.timestamp || b.date));
}
function findActiveCashSession(entries, versements, shopId) {
  const sessions = sortedCashSessions(entries, shopId);
  const last = sessions[sessions.length - 1];
  if (!last) return null;
  const closed = ownCashEntries(versements, shopId).some((v) => v.sessionId === last.id);
  return closed ? null : last;
}
// Bilan d'une session entre son ouverture et `until` (maintenant, ou la date
// du versement) : espèces attendues = fond + ventes en espèces + crédits
// encaissés − dépenses. Le Mobile Money est compté à part (hors tiroir).
function computeCashSession(session, { sales = [], expenses = [], until = null } = {}) {
  const from = cashTime(session?.timestamp || session?.date);
  const to = until ? cashTime(until) : Date.now();
  const inWindow = (d) => { const t = cashTime(d); return t > from && t <= to; };
  let cashSales = 0, cashSalesCount = 0, mobileSales = 0, mobileSalesCount = 0, creditsCollected = 0, creditsCount = 0;
  let refundsCash = 0, refundsCashCount = 0, refundsMobile = 0;
  // Détail par vendeur : qui a encaissé quoi pendant cette session.
  const vend = {};
  const V = (name) => {
    const k = (name || "").trim() || "Non renseigné";
    if (!vend[k]) vend[k] = { name: k, cash: 0, cashCount: 0, mobile: 0, mobileCount: 0, credits: 0, creditsCount: 0, refunds: 0, refundsCount: 0, expenses: 0, tickets: 0 };
    return vend[k];
  };
  (sales || []).forEach((sale) => {
    // Ventes comptées à leur montant d'origine (avant retours) : un retour
    // n'est pas une vente en moins le jour de la vente, c'est de l'argent qui
    // SORT le jour du retour — compté à part ci-dessous.
    const gross = (Number(sale.total) || 0) + returnedAmountOf(sale);
    saleReturnsOf(sale).forEach((r) => {
      if (!inWindow(r.date) || !(Number(r.refund) > 0)) return;
      if (r.refundMode === "especes") { refundsCash += Number(r.refund) || 0; refundsCashCount += 1; const v = V(r.by); v.refunds += Number(r.refund) || 0; v.refundsCount += 1; }
      else if (r.refundMode === "mobile") refundsMobile += Number(r.refund) || 0;
    });
    if (sale.paymentMethod === "especes" && inWindow(sale.date)) { cashSales += gross; cashSalesCount += 1; const v = V(sale.vendor); v.cash += gross; v.cashCount += 1; v.tickets += 1; }
    else if (sale.paymentMethod === "mobile" && inWindow(sale.date)) { mobileSales += gross; mobileSalesCount += 1; const v = V(sale.vendor); v.mobile += gross; v.mobileCount += 1; v.tickets += 1; }
    else if (sale.paymentMethod === "credit") {
      if (inWindow(sale.date)) V(sale.vendor).tickets += 1;
      creditPaymentsOf(sale).forEach((pay) => {
        if (inWindow(pay.date)) { creditsCollected += Number(pay.amount) || 0; creditsCount += 1; const v = V(pay.by || sale.vendor); v.credits += Number(pay.amount) || 0; v.creditsCount += 1; }
      });
    }
  });
  const periodExpenses = (expenses || []).filter((e) => inWindow(e.date));
  // Une dépense sans auteur (anciennes saisies) reste dans le total général
  // sans être attribuée à un vendeur.
  periodExpenses.forEach((e) => { if ((e.author || "").trim()) V(e.author).expenses += Number(e.amount) || 0; });
  const byVendor = Object.values(vend)
    .map((v) => ({ ...v, expectedCash: v.cash + v.credits - v.refunds - v.expenses }))
    .filter((v) => v.tickets || v.credits || v.refunds || v.expenses)
    .sort((a, b) => (b.cash + b.mobile + b.credits) - (a.cash + a.mobile + a.credits));
  const expensesTotal = periodExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const fund = Number(session?.amount) || 0;
  return {
    fund, cashSales, cashSalesCount, mobileSales: mobileSales - refundsMobile, mobileSalesCount, creditsCollected, creditsCount,
    expensesTotal, expensesCount: periodExpenses.length,
    refundsCash, refundsCashCount, refundsMobile, byVendor,
    expected: fund + cashSales + creditsCollected - expensesTotal - refundsCash,
  };
}

// ---------- Caisse : montant affiché pour une journée donnée ----------
// Le fond de caisse d'une journée est celui de la dernière session ouverte
// ce jour-là ou avant. Tant qu'aucun versement ne l'a clôturée, il est
// REPORTÉ tel quel sur les jours suivants (ex : 5 000 saisis le 22 restent
// 5 000 le 23 tant que le versement n'est pas fait) — on ne le remet jamais
// à zéro et on ne le remplace pas par un montant inventé.
function cashDayKeyOf(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}
function cashSnapshotForDay(entries, versements, shopId, dayKey) {
  const sessions = sortedCashSessions(entries, shopId).filter((e) => (e.date || cashDayKeyOf(e.timestamp)) <= dayKey);
  if (sessions.length === 0) return null;
  const session = sessions[sessions.length - 1];
  const sessionDay = session.date || cashDayKeyOf(session.timestamp);
  const versement = ownCashEntries(versements, shopId).find((v) => v.sessionId === session.id) || null;
  const versedDay = versement ? cashDayKeyOf(versement.date) : null;
  return {
    session,
    amount: Number(session.amount) || 0,
    setBy: session.setBy || "",
    sessionDay,
    carried: sessionDay !== dayKey,
    versement,
    versedOnOrBefore: !!(versedDay && versedDay <= dayKey),
    sessionsThatDay: sortedCashSessions(entries, shopId).filter((e) => (e.date || cashDayKeyOf(e.timestamp)) === dayKey),
  };
}
function listCashDays(fromKey, toKey, maxDays = 62) {
  const out = [];
  const d = new Date(toKey + "T12:00:00");
  const stop = new Date(fromKey + "T12:00:00");
  while (d >= stop && out.length < maxDays) { out.push(cashDayKeyOf(d)); d.setDate(d.getDate() - 1); }
  return out;
}

function buildDailySeries(sales, days = 7) {
  const arr = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    const label = d.toLocaleDateString("fr-FR", { weekday: "short" });
    const total = sales.filter((s) => new Date(s.date).toDateString() === key).reduce((sum, s) => sum + s.total, 0);
    arr.push({ label, total });
  }
  return arr;
}
function buildMonthlySeries(sales, months = 6) {
  const arr = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const label = d.toLocaleDateString("fr-FR", { month: "short" });
    const total = sales
      .filter((s) => { const sd = new Date(s.date); return `${sd.getFullYear()}-${sd.getMonth()}` === key; })
      .reduce((sum, s) => sum + s.total, 0);
    arr.push({ label, total });
  }
  return arr;
}
function buildTopProducts(sales, limit = 5) {
  const counts = {};
  sales.forEach((s) => s.items.forEach((i) => { counts[i.product.name] = (counts[i.product.name] || 0) + i.qty; }));
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([name, qty]) => ({ name, qty }));
}
function buildHourlySeries(sales) {
  const buckets = Array.from({ length: 18 }, (_, i) => { const h = i + 6; return { hour: h, label: `${h}h`, count: 0, total: 0 }; }); // 6h à 23h
  sales.forEach((s) => {
    const h = new Date(s.date).getHours();
    const bucket = buckets.find((b) => b.hour === h);
    if (bucket) { bucket.count += 1; bucket.total += s.total; }
  });
  return buckets;
}
function sumRevenueBetween(sales, start, end) {
  return sales.filter((s) => { const d = new Date(s.date); return d >= start && d < end; }).reduce((sum, s) => sum + s.total, 0);
}
function exportSalesCSV(sales, pushToast) {
  const header = ["Date", "Vendeur", "Articles", "Paiement", "Client", "Total", "Encaissé par", "Date encaissement"];
  const rows = sales.map((s) => [
    new Date(s.date).toLocaleString("fr-FR"),
    s.vendor,
    s.items.map((i) => `${i.qty}x ${i.product.name}`).join(" | "),
    PAYMENT_LABELS[s.paymentMethod] || s.paymentMethod,
    s.clientName || "",
    s.total,
    s.paidBy || "",
    s.paidDate ? new Date(s.paidDate).toLocaleString("fr-FR") : "",
  ]);
  const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  exportCsvFile(`ventes_${new Date().toISOString().slice(0, 10)}.csv`, "\uFEFF" + csv)
    .catch(() => pushToast?.("Impossible d'exporter le CSV", "error"));
}

/* ---------- Style global ---------- */

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
      html, body { overflow-x: hidden; width: 100%; max-width: 100vw; }
      .gb-root{
        overflow-x: hidden; max-width: 100vw;
        --ink:#0F1B16; --glass:#0E3B2A; --glass-light:#175943;
        --cap:#E8A33D; --soda:#2C7DA0; --paper:#F4F6F1; --paper-dim:#E4E9DF;
        --danger:#C1442E; --line:#D8DFD4; --card:#FFFFFF;
        font-family:'Inter',sans-serif; color:var(--ink); background:var(--paper);
        transition: background-color .25s ease, color .25s ease;
      }
      .gb-root.gb-dark{
        --ink:#EDF2EE; --paper:#0A130E; --paper-dim:#16221A;
        --line:#243026; --card:#111C15;
      }
      .gb-root *{ transition: background-color .2s ease, border-color .2s ease, color .2s ease; }
      .gb-root input:not([type="range"]):not(.bg-transparent), .gb-root select:not(.bg-transparent), .gb-root textarea:not(.bg-transparent) {
        background: var(--card); color: var(--ink);
      }
      .gb-root input::placeholder, .gb-root textarea::placeholder { color: var(--ink); opacity: 0.4; }
      .gb-root .font-display{ font-family:'Space Grotesk',sans-serif; }
      .gb-root .font-mono{ font-family:'IBM Plex Mono',monospace; }
      .gb-scroll::-webkit-scrollbar{ display:none; }
      .gb-scroll{ -ms-overflow-style:none; scrollbar-width:none; }
      .ticket-edge{
        clip-path: polygon(0 0,100% 0,100% 96%,94% 100%,88% 96%,82% 100%,76% 96%,70% 100%,64% 96%,58% 100%,52% 96%,46% 100%,40% 96%,34% 100%,28% 96%,22% 100%,16% 96%,10% 100%,4% 96%,0 100%);
      }
      .gb-focus:focus-visible{ outline:2px solid var(--cap); outline-offset:2px; }
      @keyframes gb-pop{ 0%{transform:scale(.9); opacity:0;} 100%{transform:scale(1); opacity:1;} }
      .gb-pop{ animation: gb-pop .18s ease-out; }
      @keyframes gb-slide-up{ 0%{transform:translateY(16px); opacity:0;} 100%{transform:translateY(0); opacity:1;} }
      .gb-slide-up{ animation: gb-slide-up .22s ease-out; }
      @keyframes gb-slide-in-left{ 0%{transform:translateX(-100%);} 100%{transform:translateX(0);} }
      .gb-slide-in-left{ animation: gb-slide-in-left .22s ease-out; }
      @keyframes gb-toast-in{ 0%{transform:translate(-50%,-16px) scale(.96); opacity:0;} 60%{transform:translate(-50%,2px) scale(1.01); opacity:1;} 100%{transform:translate(-50%,0) scale(1); opacity:1;} }
      .gb-toast-in{ left:50%; transform:translateX(-50%); animation: gb-toast-in .38s cubic-bezier(.2,.9,.25,1.15) forwards; }
      @keyframes gb-toast-bar{ 0%{width:100%;} 100%{width:0%;} }
      .gb-toast-bar{ animation: gb-toast-bar 2.2s linear forwards; }
      @keyframes gb-blink{ 0%,50%{opacity:1;} 51%,100%{opacity:0;} }
      .gb-caret{ animation: gb-blink .8s step-end infinite; }
      @keyframes gb-pulse-glow{ 0%,100%{ box-shadow: 0 0 0 0 rgba(245,166,35,0.5); } 50%{ box-shadow: 0 0 0 8px rgba(245,166,35,0); } }
      .gb-pulse{ animation: gb-pulse-glow 2.2s ease-in-out infinite; }
      @keyframes gb-sale-toast-in{ 0%{transform:translateX(115%); opacity:0;} 70%{transform:translateX(-4%); opacity:1;} 100%{transform:translateX(0); opacity:1;} }
      .gb-sale-toast-in{ animation: gb-sale-toast-in .45s cubic-bezier(.2,.9,.25,1.15) forwards; }
      @keyframes gb-sale-toast-out{ 0%{transform:translateX(0); opacity:1; max-height:100px; margin-bottom:8px;} 100%{transform:translateX(115%); opacity:0; max-height:100px; margin-bottom:8px;} }
      .gb-sale-toast-out{ animation: gb-sale-toast-out .32s ease-in forwards; }
      @keyframes gb-sale-toast-bar{ 0%{width:100%;} 100%{width:0%;} }
      .gb-sale-toast-bar{ animation: gb-sale-toast-bar linear forwards; }
      @keyframes gb-scan-line{ 0%{top:2%;} 100%{top:98%;} }
      .gb-scan-line{ position:absolute; left:4%; right:4%; height:2px; background:var(--cap); box-shadow:0 0 10px 1px var(--cap); animation: gb-scan-line 1.6s ease-in-out infinite alternate; }
      @keyframes gb-marquee{ 0%{transform:translateX(0);} 100%{transform:translateX(-50%);} }
      .gb-marquee-track{ animation: gb-marquee linear infinite; }
      .gb-marquee-wrap:active .gb-marquee-track, .gb-marquee-wrap:hover .gb-marquee-track{ animation-play-state: paused; }
      .gb-input-dark::placeholder{ color: rgba(255,255,255,0.55) !important; opacity: 1 !important; }
      @media print {
        body * { visibility: hidden; }
        #receipt-print-area, #receipt-print-area *, #sales-print-area, #sales-print-area *, #daily-report-print-area, #daily-report-print-area * { visibility: visible; }
        #receipt-print-area, #sales-print-area, #daily-report-print-area { position: fixed; top: 0; left: 0; width: 100%; }
        .no-print { display: none !important; }
      }
    `}</style>
  );
}

/* ---------- Petits composants ---------- */

function CapGauge({ pct, color, size = 50, danger }) {
  const ringColor = danger ? "var(--danger)" : color;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(${ringColor} ${pct * 3.6}deg, #0000001A 0deg)` }} />
      <div className="absolute inset-[3px] rounded-full flex items-center justify-center" style={{ background: "var(--paper)" }}>
        <span className="font-mono font-semibold" style={{ fontSize: size * 0.22, color: ringColor }}>{pct}%</span>
      </div>
    </div>
  );
}
function CategoryIcon({ cat, categories, size = 15 }) {
  const meta = getCategory(categories, cat);
  const Icon = ICON_MAP[meta.icon] || Beer;
  return <Icon size={size} color={meta.color} strokeWidth={2.3} />;
}
// Date de la "journée commerciale" courante au format AAAA-MM-JJ — clé
// unique du fond de caisse. Accepte une heure de bascule (resetHour, 0-23,
// par défaut minuit) : tant que l'heure locale n'a pas atteint cette heure,
// on est encore considéré comme étant "hier" pour la caisse — utile pour
// les commerces ouverts tard (ex : bar ouvert jusqu'à 2h du matin), où
// minuit pile n'est pas une vraie frontière de journée pour la caisse.
// Partagée entre AppInner (enregistrement) et HistoryScreen (affichage),
// pour être certain que les deux s'accordent sur le même jour.
function todayCashDateKey(resetHour = 0) {
  const d = new Date();
  if (d.getHours() < (resetHour || 0)) d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function StatCard({ icon: Icon, label, value, dark, danger, tintBg, tintFg, compact }) {
  const bg = tintBg || (dark ? "var(--glass)" : "var(--card)");
  const fg = tintFg || (dark ? "var(--cap)" : danger ? "var(--danger)" : "var(--ink)");
  const valueColor = tintFg || (dark ? "#fff" : danger ? "var(--danger)" : "var(--ink)");
  return (
    <div className={compact ? "rounded-2xl p-2.5" : "rounded-2xl p-3.5"} style={{ background: bg, border: dark || tintBg ? "none" : `1px solid ${danger ? "var(--danger)" : "var(--line)"}` }}>
      <Icon size={compact ? 14 : 16} color={fg} />
      <div className={compact ? "font-mono font-bold text-sm mt-1.5 truncate" : "font-mono font-bold text-lg mt-1.5"} style={{ color: valueColor }}>{value}</div>
      <div className={compact ? "text-[9px] mt-0.5 truncate" : "text-[11px] mt-0.5"} style={{ color: tintFg || (dark ? "#ffffffb0" : "var(--ink)"), opacity: tintFg ? 0.75 : dark ? 1 : 0.5 }}>{label}</div>
    </div>
  );
}
function Toast({ toast }) {
  if (!toast) return null;
  const isErr = toast.type === "error";
  const accent = isErr ? "var(--danger)" : "#1CA857";
  const tint = isErr ? "#FCEBE8" : "#E7F7EE";
  return (
    <div key={toast.message + toast.type} className="fixed z-[95] w-[calc(100%-2rem)] max-w-[380px] no-print gb-toast-in" style={{ left: "50%", top: "calc(1.25rem + env(safe-area-inset-top))" }}>
      <div className="relative flex items-center gap-3 pl-3.5 pr-4 py-3.5 rounded-2xl overflow-hidden" style={{ background: "var(--card)", boxShadow: "0 12px 32px -8px rgba(15,27,22,0.28), 0 2px 8px rgba(15,27,22,0.08)", borderLeft: `4px solid ${accent}` }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: tint }}>
          {isErr ? <AlertTriangle size={17} color={accent} strokeWidth={2.4} /> : <Check size={17} color={accent} strokeWidth={2.8} />}
        </div>
        <p className="text-sm font-semibold leading-snug flex-1" style={{ color: "var(--ink)" }}>{toast.message}</p>
        <div className="absolute bottom-0 left-0 h-[3px] gb-toast-bar" style={{ background: accent }} />
      </div>
    </div>
  );
}

// Pile de notifications flash "vente enregistrée" — glissent depuis la
// droite, empilées en bas au-dessus de la barre d'onglets, chacune avec son
// propre minuteur de 7 secondes indépendant.
function SaleToastStack({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed z-[94] left-0 right-0 flex flex-col items-end px-3 pointer-events-none no-print" style={{ top: "calc(1.25rem + env(safe-area-inset-top))" }}>
      {toasts.map((t) => (
        <div key={t.id} className={`w-full max-w-[380px] mb-2 ${t.leaving ? "gb-sale-toast-out" : "gb-sale-toast-in"}`}>
          <div className="rounded-2xl overflow-hidden" style={{ background: "#0A2E24", boxShadow: "0 10px 26px -6px rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#123D30", border: "1px solid rgba(111,207,158,0.35)" }}>
                <Check size={18} color="#6FCF9E" strokeWidth={2.6} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold tracking-wide" style={{ color: "#6FCF9E" }}>VENTE ENREGISTRÉE</p>
                <p className="text-lg font-bold text-white leading-tight mt-0.5 truncate">{t.amount.toLocaleString("fr-FR")} FCFA</p>
              </div>
              {t.paymentLabel && (
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0" style={{ background: "#E8E4D9", color: "#0A2E24" }}>{t.paymentLabel}</span>
              )}
            </div>
            {!t.leaving && (
              <div className="h-[3px]" style={{ background: "rgba(255,255,255,0.1)" }}>
                <div className="h-full gb-sale-toast-bar" style={{ background: "#6FCF9E", animationDuration: "7s" }} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Configuration initiale ---------- */

function ActivationCodeForm({ onActivate, pushToast, accent }) {
  const [raw, setRaw] = useState("");
  const [checking, setChecking] = useState(false);

  const submit = async () => {
    if (raw.length !== 12) { pushToast("Le code doit contenir 12 chiffres.", "error"); return; }
    setChecking(true);
    try {
      await onActivate(raw);
      setRaw("");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="w-full max-w-xs">
      <input
        value={formatActivationInput(raw)}
        onChange={(e) => setRaw(e.target.value.replace(/\D/g, "").slice(0, 12))}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="0000-0000-0000"
        inputMode="numeric"
        className="gb-input-dark gb-focus w-full rounded-2xl px-4 py-3.5 text-lg font-mono text-center tracking-wider outline-none mb-3"
        style={{ background: "var(--glass-light)", color: "#fff" }}
      />
      <button onClick={submit} disabled={checking} className="gb-focus w-full rounded-2xl py-3 font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-50" style={{ background: accent || "var(--cap)", color: "var(--glass)" }}>
        {checking ? "Vérification…" : "Activer"}
      </button>
    </div>
  );
}

const LICENSE_PLANS_PRICING = [
  { id: "1m", name: "Essentiel", duration: "1 mois", price: 2999, oldPrice: 15000, icon: "Zap", iconBg: "#EAF3DE", iconColor: "#27500A", borderColor: "#4C7A2E" },
  { id: "3m", name: "Avancé", duration: "3 mois", price: 7990, oldPrice: 50000, icon: "Rocket", iconBg: "#E6F1FB", iconColor: "#0C447C", borderColor: "#1E6FB8", popular: true },
  { id: "6m", name: "Professionnel", duration: "6 mois", price: 15900, oldPrice: 150000, icon: "Crown", iconBg: "#F0EDFE", iconColor: "#3C3489", borderColor: "#6B5FC4" },
  { id: "12m", name: "Entreprise", duration: "12 mois", price: 29500, oldPrice: 250000, icon: "Building2", iconBg: "#FAEEDA", iconColor: "#633806", borderColor: "#B8863A" },
  { id: "lifetime", name: "Permanent", duration: "À vie", price: null, oldPrice: null, icon: "Infinity" },
];

function PricingScreen({ registeredAdmin, onClose, pushToast, shopName }) {
  const [ordering, setOrdering] = useState(null); // plan sélectionné
  const [name, setName] = useState(registeredAdmin?.name || "");
  const [phone, setPhone] = useState(registeredAdmin?.phone || "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submitOrder = async () => {
    if (!name.trim() || !phone.trim()) { pushToast("Nom et téléphone requis", "error"); return; }
    setSending(true);
    try {
      const label = ordering.price ? `${ordering.name} — ${ordering.duration} (${ordering.price.toLocaleString("fr-FR")} FCFA)` : `${ordering.name} — ${ordering.duration}`;
      await api.supportSend({ name: name.trim(), phone: phone.trim(), email: registeredAdmin?.email || "", message: `Je souhaite commander la licence : ${label}` });
      setSent(true);
    } catch {
      pushToast("Erreur d'envoi — vérifie ta connexion et réessaie", "error");
    } finally {
      setSending(false);
    }
  };

  // En-tête réutilisé dans les deux écrans (liste des plans + formulaire de
  // commande), pour que la page ressemble aux autres pages de l'app plutôt
  // qu'à une fenêtre isolée. Juste le nom de l'entreprise et le bouton
  // fermer — l'icône de recherche et la barre du bas étaient décoratives
  // (rien derrière) et n'ont fait que semer la confusion.
  const TopBar = () => (
    <div className="flex items-center justify-between px-4 shrink-0" style={{ background: "var(--card)", borderBottom: "1px solid var(--line)", paddingTop: "max(14px, env(safe-area-inset-top))", paddingBottom: 14 }}>
      <div>
        <p className="font-display font-bold text-base leading-none">{shopName || "Entreprise"}</p>
        <p className="text-[11px] opacity-50 mt-1">Administrateur</p>
      </div>
      <button onClick={onClose} className="gb-focus w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--paper-dim)" }}><X size={16} /></button>
    </div>
  );

  if (ordering) {
    return (
      <div className="min-h-full flex flex-col" style={{ background: "var(--paper)" }}>
        <TopBar />
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
          {sent ? (
            <div className="text-center gb-slide-up">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "#1CA857" }}>
                <Check size={30} color="#fff" strokeWidth={2.5} />
              </div>
              <h1 className="font-display font-bold text-xl mb-2">Demande envoyée !</h1>
              <p className="opacity-60 text-sm max-w-[260px] mx-auto mb-6">L'administrateur te contactera très vite pour finaliser ton achat.</p>
              <button onClick={onClose} className="gb-focus rounded-2xl py-3 px-6 font-semibold text-sm text-white" style={{ background: "var(--glass)" }}>Retour</button>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center gb-slide-up">
                <h1 className="font-display font-bold text-xl">{ordering.name}</h1>
                <p className="opacity-60 text-sm mt-1">{ordering.duration}{ordering.price ? ` — ${ordering.price.toLocaleString("fr-FR")} FCFA` : ""}</p>
              </div>
              <div className="w-full max-w-xs flex flex-col gap-3">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ton nom" className="gb-focus w-full rounded-2xl px-4 py-3.5 text-sm border outline-none" style={{ borderColor: "var(--line)" }} />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Numéro de téléphone" className="gb-focus w-full rounded-2xl px-4 py-3.5 text-sm border outline-none" style={{ borderColor: "var(--line)" }} />
                <button onClick={submitOrder} disabled={sending} className="gb-focus w-full rounded-2xl py-3 font-semibold text-sm text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg, var(--cap), #C9770E)" }}>
                  {sending ? "Envoi…" : "Envoyer la demande"}
                </button>
                <button onClick={() => setOrdering(null)} className="gb-focus text-xs underline self-center opacity-50">Retour aux tarifs</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col" style={{ background: "var(--paper)" }}>
      <TopBar />
      <div className="flex-1 overflow-y-auto gb-scroll px-4 py-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#FAEEDA" }}><Star size={17} color="#854F0B" /></div>
          <h1 className="font-display font-bold text-lg">Nos licences</h1>
        </div>
        <div className="flex flex-col gap-3">
          {LICENSE_PLANS_PRICING.map((p) => {
            const PlanIcon = { Zap, Rocket, Crown, Building2, Infinity }[p.icon];
            if (p.id === "lifetime") {
              return (
                <div key={p.id} className="rounded-2xl p-4" style={{ background: p.iconBg || "#FBEAF0", border: "1px solid #ED93B1" }}>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--card)" }}><PlanIcon size={18} color="#993556" /></div>
                    <div className="flex-1">
                      <p className="font-display font-bold text-base" style={{ color: "#4B1528" }}>{p.name}</p>
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide mt-0.5" style={{ background: "#993556", color: "#fff" }}>{p.duration.toUpperCase()}</span>
                    </div>
                  </div>
                  <p className="text-xs mb-3" style={{ color: "#993556" }}>Accès à vie — tarif sur demande</p>
                  <button onClick={() => setOrdering(p)} className="gb-focus w-full rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: "#993556" }}>
                    Contacter l'administrateur
                  </button>
                </div>
              );
            }
            return (
              <div key={p.id} className="relative rounded-2xl p-4" style={{ background: p.popular ? "#E6F1FB" : p.iconBg, border: `${p.popular ? "2px" : "1px"} solid ${p.borderColor}` }}>
                {p.popular && (
                  <span className="absolute -top-2.5 left-4 text-[10px] font-bold px-2.5 py-0.5 rounded-full" style={{ background: "var(--cap)", color: "var(--glass)" }}>Le plus choisi</span>
                )}
                <div className="flex items-center gap-2.5 mb-1 mt-0.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--card)" }}><PlanIcon size={18} color={p.iconColor} /></div>
                  <div className="flex-1">
                    <p className="font-display font-bold text-base" style={{ color: p.iconColor }}>{p.name}</p>
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide mt-0.5" style={{ background: p.popular ? p.iconColor : "var(--card)", color: p.popular ? "#fff" : p.iconColor }}>{p.duration.toUpperCase()}</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-3 mt-2">
                  <span className="font-mono font-bold text-lg" style={{ color: p.iconColor }}>{p.price.toLocaleString("fr-FR")} FCFA</span>
                  <span className="font-mono text-xs opacity-40 line-through">{p.oldPrice.toLocaleString("fr-FR")} FCFA</span>
                </div>
                <button onClick={() => setOrdering(p)} className={`gb-focus w-full rounded-xl py-2.5 text-sm font-semibold ${p.popular ? "gb-pulse" : ""}`} style={p.popular ? { background: "linear-gradient(135deg, var(--cap), #C9770E)", color: "#fff" } : { background: "var(--card)", border: "1px solid var(--line)" }}>
                  Commander
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RenewLicenseModal({ onActivate, onClose, pushToast }) {
  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center px-5 no-print">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-[340px] rounded-3xl p-6 gb-pop max-h-[85vh] overflow-y-auto gb-scroll" style={{ background: "var(--glass)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-white">Renouveler la licence</h2>
          <button onClick={onClose} className="gb-focus p-1"><X size={20} color="#fff" /></button>
        </div>
        <p className="text-white/60 text-xs mb-4">Entrez un nouveau code d'activation pour prolonger votre accès.</p>
        <ActivationCodeForm onActivate={(r) => { onActivate(r); onClose(); }} pushToast={pushToast} />
      </div>
    </div>
  );
}

// Écran plein écran affiché à la place de TOUT le reste de l'app (vente,
// stock, crédits, historique, admin) dès que la licence est expirée — pour
// le propriétaire comme pour les vendeurs, personne n'a plus accès à la
// boutique tant qu'un nouveau code n'a pas été activé.
function LicenseLockedScreen({ role, shopName, onLogout, onActivate, pushToast }) {
  const [showRenew, setShowRenew] = useState(false);
  const isOwner = role === "admin";
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-10 text-center" style={{ background: "var(--glass)" }}>
      <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.12)" }}>
        <ShieldCheck size={28} color="var(--danger)" />
      </div>
      <h1 className="font-display font-bold text-xl text-white mb-2">Entreprise verrouillée</h1>
      <p className="text-white/60 text-sm max-w-[280px] mx-auto mb-1.5">
        {shopName ? `La licence de "${shopName}" est expirée.` : "La licence de cette entreprise est expirée."}
      </p>
      <p className="text-white/50 text-xs max-w-[280px] mx-auto mb-7">
        {isOwner
          ? "L'accès est suspendu pour vous et vos vendeurs. Activez un nouveau code pour rouvrir l'entreprise."
          : "L'accès est suspendu en attendant que le propriétaire renouvelle la licence. Préviens-le si ce n'est pas déjà fait."}
      </p>
      {isOwner ? (
        <button onClick={() => setShowRenew(true)} className="gb-focus w-full max-w-xs rounded-2xl py-3.5 font-semibold text-sm text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-transform" style={{ background: "var(--cap)", color: "var(--glass)" }}>
          <KeyRound size={16} /> Activer une licence
        </button>
      ) : (
        <div className="w-full max-w-xs rounded-2xl py-3.5 px-4 text-xs font-medium" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>
          Contacte le propriétaire de l'entreprise
        </div>
      )}
      {onLogout && (
        <button onClick={onLogout} className="gb-focus mt-6 text-white/40 text-xs underline">Se déconnecter</button>
      )}
      {showRenew && <RenewLicenseModal onActivate={onActivate} onClose={() => setShowRenew(false)} pushToast={pushToast} />}
    </div>
  );
}

const TERMS_SECTIONS = [
  { title: "1. Objet", body: "GestiOne est une application de gestion de caisse, de stock et de crédits clients destinée aux petits commerces (maquis, bars, buvettes, caves, entreprises...). Les présentes conditions encadrent l'utilisation de l'application par le propriétaire d'une entreprise et par les vendeurs qu'il autorise." },
  { title: "2. Compte et essai gratuit", body: "Chaque entreprise créée bénéficie d'un essai gratuit de 14 jours donnant accès à l'ensemble des fonctionnalités, sans engagement. À l'issue de l'essai, l'accès à l'entreprise est suspendu jusqu'à l'activation d'une licence payante." },
  { title: "3. Licences et paiement", body: "Les licences sont proposées par durée (1, 3, 6 ou 12 mois) ou à vie. Un code de licence est à usage unique et ne peut être activé que sur une seule entreprise. Les tarifs affichés dans l'application sont ceux en vigueur au moment de l'achat et peuvent évoluer." },
  { title: "4. Comptes vendeurs", body: "Le propriétaire d'une entreprise peut créer des comptes vendeurs, chacun protégé par un code d'accès personnel. Le propriétaire est responsable de la bonne attribution et de la sécurité de ces accès au sein de son équipe." },
  { title: "5. Fonctionnement hors-ligne", body: "L'application fonctionne sans connexion internet pour les opérations quotidiennes (vente, stock, consultation). Une connexion est nécessaire pour la création d'une entreprise, l'activation d'une licence, et la synchronisation entre plusieurs appareils." },
  { title: "6. Responsabilité", body: "GestiOne est un outil de gestion. L'exactitude des données saisies (prix, stock, ventes, informations clients) relève de la responsabilité de l'utilisateur. GestiOne ne peut être tenu responsable des décisions commerciales prises sur la base de ces données." },
  { title: "7. Suspension et résiliation", body: "L'accès à une entreprise peut être suspendu en cas de licence expirée ou de non-respect des présentes conditions. La suppression d'une entreprise entraîne la suppression définitive de ses données, y compris pour tous les vendeurs qui y sont rattachés." },
  { title: "8. Modification des conditions", body: "Ces conditions peuvent être mises à jour. Les utilisateurs seront informés de toute modification substantielle via l'application." },
];

const PRIVACY_SECTIONS = [
  { title: "1. Données collectées", body: "GestiOne collecte les informations nécessaires au fonctionnement de l'application : nom et type de l'entreprise, produits et catégories, ventes, mouvements de stock, noms des vendeurs et clients renseignés (et leur numéro de téléphone si saisi), ainsi qu'un identifiant technique de l'appareil." },
  { title: "2. Codes d'accès", body: "Les codes PIN (administrateur et vendeurs) ne sont jamais stockés en clair. Ils sont transformés de façon irréversible (hachage) avant tout enregistrement, y compris sur le serveur. Personne, pas même l'équipe GestiOne, ne peut consulter un code déjà créé — seule une réinitialisation (génération d'un nouveau code) est possible." },
  { title: "3. Où sont stockées les données", body: "Les données de chaque entreprise sont conservées localement sur l'appareil, et synchronisées avec un serveur sécurisé pour permettre l'accès depuis plusieurs appareils et la reconnexion en cas de changement de téléphone. Chaque entreprise est strictement cloisonnée : aucun autre compte ne peut accéder à ses données." },
  { title: "4. Utilisation des données", body: "Les données collectées servent uniquement au fonctionnement de l'application (vente, stock, statistiques, licence) et à l'assistance technique en cas de besoin. Elles ne sont ni vendues, ni partagées avec des tiers à des fins publicitaires." },
  { title: "5. Publicité", body: "GestiOne n'affiche aucune publicité et ne partage aucune donnée avec des annonceurs." },
  { title: "6. Conservation et suppression", body: "Les données d'une entreprise sont conservées tant que l'entreprise existe. La suppression d'une entreprise par son propriétaire entraîne la suppression définitive et irréversible de toutes ses données côté serveur." },
  { title: "7. Vos droits", body: "Le propriétaire d'une entreprise peut à tout moment consulter, corriger ou supprimer les données de son entreprise depuis l'application. Pour toute question relative à vos données, contactez l'assistance depuis l'application." },
  { title: "8. Sécurité", body: "L'accès aux données passe systématiquement par une vérification d'appareil. Les communications avec le serveur sont chiffrées. Des mesures raisonnables sont mises en œuvre pour protéger les données contre tout accès non autorisé." },
];

const DELETION_SECTIONS = [
  { title: "1. Qui peut demander une suppression", body: "Le propriétaire (administrateur) d'une entreprise GestiOne peut, à tout moment, demander la suppression définitive de son entreprise et de toutes les données associées (produits, ventes, stock, clients, vendeurs, historique)." },
  { title: "2. Procédure depuis l'application", body: "Se connecter à GestiOne avec le code administrateur de l'entreprise concernée, puis se rendre dans Admin > Établissements (ou Boutiques), sélectionner l'entreprise à supprimer, puis confirmer la suppression. L'opération est immédiate et irréversible." },
  { title: "3. Sans accès à l'application", body: "Si l'administrateur n'a plus accès à l'application (téléphone perdu, application désinstallée), il peut demander la suppression par e-mail à ayekoe83@gmail.com, en précisant le nom de l'entreprise. La demande est traitée après vérification de l'identité du demandeur." },
  { title: "4. Données supprimées", body: "La suppression efface définitivement, côté serveur, l'ensemble des données de l'entreprise : catalogue de produits, historique des ventes, mouvements de stock, clients, comptes vendeurs, crédits et avoirs, ainsi que le code d'accès administrateur." },
  { title: "5. Données conservées", body: "Aucune donnée de l'entreprise n'est conservée après suppression, à l'exception d'éventuelles sauvegardes techniques de courte durée conservées par notre hébergeur (Supabase) et automatiquement purgées selon leur cycle normal." },
];

// `doc` = "terms" | "privacy" | "deletion". Un seul écran pour les trois
// documents, accessible depuis le pied de page de l'accueil et depuis le
// menu latéral.
function LegalScreen({ doc, onSwitch, onClose }) {
  const isTerms = doc === "terms";
  const isDeletion = doc === "deletion";
  const sections = isDeletion ? DELETION_SECTIONS : isTerms ? TERMS_SECTIONS : PRIVACY_SECTIONS;
  const title = isDeletion ? "Suppression de compte" : isTerms ? "Conditions d'utilisation" : "Politique de confidentialité";
  return (
    <div className="fixed inset-0 z-[97] flex flex-col no-print" style={{ background: "var(--paper)" }}>
      <div className="shrink-0" style={{ background: "var(--glass)", paddingTop: "max(22px, env(safe-area-inset-top))" }}>
        <div className="px-5 pb-5 flex items-center justify-between">
          <div>
            <p className="text-white font-display font-bold text-lg">{title}</p>
            <p className="text-white/45 text-[11px] mt-0.5">Dernière mise à jour : 7 septembre 2026</p>
          </div>
          <button onClick={onClose} className="gb-focus w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.12)" }}><X size={16} color="#fff" /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto gb-scroll px-5 py-5" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
        {sections.map((s) => (
          <div key={s.title} className="mb-5">
            <h3 className="font-display font-bold text-sm mb-1.5">{s.title}</h3>
            <p className="text-[13px] leading-relaxed opacity-75">{s.body}</p>
          </div>
        ))}
        {onSwitch && !isDeletion && (
          <button onClick={onSwitch} className="gb-focus w-full rounded-xl py-3 text-sm font-semibold mt-2" style={{ background: "var(--paper-dim)" }}>
            Voir {isTerms ? "la politique de confidentialité" : "les conditions d'utilisation"}
          </button>
        )}
      </div>
    </div>
  );
}



function OnboardingScreen({ shops, onComplete, onJoinShop, pushToast, initialMode, onCancel, hasSavedShop, savedShopName, onResume, trialUsed, onStartTrial }) {
  const [mode, setMode] = useState(initialMode || null); // null = choix, "create", "join", "reconnect"
  const [startingTrial, setStartingTrial] = useState(false);

  const openCreate = async () => {
    if (!trialUsed && onStartTrial) {
      setStartingTrial(true);
      await onStartTrial();
      setStartingTrial(false);
    }
    setMode("create");
  };
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [type, setType] = useState("maquis");
  const [vendorName, setVendorName] = useState("");
  const [vendorPin, setVendorPin] = useState("");
  const [currency, setCurrency] = useState("XAF");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [customType, setCustomType] = useState("");
  const [legalDoc, setLegalDoc] = useState(null);
  // Synchronise l'URL avec la page légale affichée, pour qu'elle ait sa
  // propre adresse (nécessaire pour la déclarer telle quelle dans Google
  // Play Console — "URL des règles de confidentialité") et reste partageable
  // ou consultable directement, sans passer par l'app. Au montage, une visite
  // directe sur /privacy ou /cgu ouvre tout de suite le bon document ; par la
  // suite, ouvrir/fermer le document met à jour la barre d'adresse, et le
  // bouton précédent du navigateur referme proprement le document.
  useEffect(() => {
    const path = window.location.pathname;
    if (path === "/privacy" || path === "/politique-confidentialite" || path === "/confidentialite") setLegalDoc("privacy");
    else if (path === "/cgu" || path === "/conditions-utilisation" || path === "/terms") setLegalDoc("terms");
    else if (path === "/delete-account" || path === "/suppression-compte") setLegalDoc("deletion");
    const onPopState = () => {
      const p = window.location.pathname;
      if (p === "/privacy" || p === "/politique-confidentialite" || p === "/confidentialite") setLegalDoc("privacy");
      else if (p === "/cgu" || p === "/conditions-utilisation" || p === "/terms") setLegalDoc("terms");
      else if (p === "/delete-account" || p === "/suppression-compte") setLegalDoc("deletion");
      else setLegalDoc(null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const path = legalDoc === "privacy" ? "/privacy" : legalDoc === "terms" ? "/cgu" : legalDoc === "deletion" ? "/delete-account" : "/";
    if (window.location.pathname !== path) window.history.pushState(null, "", path);
    document.title = legalDoc === "privacy" ? "Règles de confidentialité | GestiOne" : legalDoc === "terms" ? "Conditions d'utilisation | GestiOne" : legalDoc === "deletion" ? "Suppression de compte | GestiOne" : "GestiOne";
  }, [legalDoc]);

  const next = async () => {
    if (step === 1) {
      if (!name.trim()) { pushToast("Indiquez le nom de votre établissement", "error"); return; }
      if (type === "autre" && !customType.trim()) { pushToast("Précisez le type de votre établissement", "error"); return; }
      setStep(2); return;
    }
    if (step === 2) {
      if (!vendorName.trim() || vendorPin.length !== 4) { pushToast("Nom et code à 4 chiffres requis", "error"); return; }
      setStep(3); return;
    }
    setLoading(true);
    // "Autre" avec une précision saisie : on enregistre le texte tapé
    // directement comme type, plutôt que le mot générique "Autre".
    const finalType = type === "autre" && customType.trim() ? customType.trim() : type;
    try {
      // Le code admin, la licence d'essai et le vendeur sont désormais écrits
      // en base par le serveur DANS CET APPEL — plus de dépendance à un envoi
      // séparé après coup qui pouvait échouer (entreprise créée mais invisible
      // du panneau propriétaire, sans vendeur).
      const backend = await api.createShopBackend({
        name: name.trim(), type: finalType, currency,
        adminPin: DEFAULT_ADMIN_PIN, vendorName: vendorName.trim(), vendorPin,
      });
      const shopObj = {
        id: backend.shop_id,
        name: name.trim(), type: finalType, currency,
        joinCode: backend.join_code,
        backendLinked: true,
        adminPinHash: api.hashPin(DEFAULT_ADMIN_PIN),
      };
      const vendorObj = backend.vendor
        ? { id: backend.vendor.id, name: backend.vendor.name, pinHash: api.hashPin(vendorPin), joinCode: backend.vendor.joinCode }
        : { id: uid(), name: vendorName.trim(), pinHash: api.hashPin(vendorPin), joinCode: generateShopJoinCode() };
      onComplete(shopObj, vendorObj, backend.shop_license);
    } catch (e) {
      pushToast(api.networkErrorText(e, "créer une entreprise") || e.message || "Erreur lors de la création, réessayez.", "error");
    } finally {
      setLoading(false);
    }
  };

  const submitJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) { pushToast("Entrez le code d'invitation", "error"); return; }
    setLoading(true);
    try {
      const backend = await api.joinShopBackend({ joinCode: code });
      const pulled = await api.pullAll(backend.shop_id);
      const meta = pulled.shopMeta || {};
      const shopObj = {
        id: backend.shop_id,
        name: meta.name || backend.name,
        type: meta.type || backend.type,
        currency: meta.currency || backend.currency,
        adminPinHash: meta.adminPinHash,
        adminDisplayName: meta.adminDisplayName,
        theme: meta.theme, darkMode: meta.darkMode, soundsEnabled: meta.soundsEnabled, voiceNotificationsEnabled: meta.voiceNotificationsEnabled,
        loyaltyThreshold: meta.loyaltyThreshold, language: meta.language, cashRegisterResetHour: meta.cashRegisterResetHour,
        joinCode: code,
        backendLinked: true,
      };
      onJoinShop(shopObj, pulled, undefined, undefined, backend.shop_license);
    } catch (e) {
      pushToast(api.networkErrorText(e, "rejoindre une entreprise") || e.message || "Code introuvable", "error");
    } finally {
      setLoading(false);
    }
  };

  const [reconnectRole, setReconnectRole] = useState(null);
  const [rcShopName, setRcShopName] = useState("");
  const [rcPin, setRcPin] = useState("");
  const [rcVendorName, setRcVendorName] = useState("");
  const [rcJoinCode, setRcJoinCode] = useState("");

  const submitReconnect = async () => {
    if (!rcShopName.trim() || rcPin.length !== 4 || !rcVendorName.trim() || (reconnectRole === "vendeur" && !rcJoinCode.trim())) {
      pushToast("Merci de remplir tous les champs", "error"); return;
    }
    setLoading(true);
    try {
      const backend = await api.reconnectShopBackend({
        role: reconnectRole,
        shopName: rcShopName.trim(),
        adminPin: reconnectRole === "admin" ? rcPin : undefined,
        vendorPin: reconnectRole === "vendeur" ? rcPin : undefined,
        vendorName: rcVendorName.trim(),
        joinCode: rcJoinCode.trim(),
      });
      const pulled = await api.pullAll(backend.shop_id);
      const meta = pulled.shopMeta || {};
      const shopObj = {
        id: backend.shop_id,
        name: meta.name || backend.name,
        type: meta.type || backend.type,
        currency: meta.currency || backend.currency,
        adminPinHash: meta.adminPinHash,
        adminDisplayName: meta.adminDisplayName,
        theme: meta.theme, darkMode: meta.darkMode, soundsEnabled: meta.soundsEnabled, voiceNotificationsEnabled: meta.voiceNotificationsEnabled,
        loyaltyThreshold: meta.loyaltyThreshold, language: meta.language, cashRegisterResetHour: meta.cashRegisterResetHour,
        joinCode: backend.join_code,
        backendLinked: true,
      };
      onJoinShop(shopObj, pulled, backend.role, backend.vendorName || "Administrateur", backend.shop_license);
    } catch (e) {
      pushToast(api.networkErrorText(e, "vous reconnecter") || e.message || "Reconnexion impossible", "error");
    } finally {
      setLoading(false);
    }
  };

  if (mode === null) {
    return (
      <div className="h-full overflow-y-auto gb-scroll" style={{ background: "var(--glass)" }}>
        <div className="w-full max-w-[430px] sm:max-w-[600px] lg:max-w-[880px] mx-auto gb-slide-up" style={{ background: "var(--glass-light)" }}>
          <HeroCarousel />
          <HeroStats />

          <div className="p-6 pt-5">
            <div className="flex flex-col gap-2.5">
              {hasSavedShop && (
                <button onClick={onResume} className="gb-focus gb-pulse w-full rounded-2xl py-3.5 font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.96] transition-transform" style={{ background: "linear-gradient(135deg, var(--cap), #E0791A)", color: "var(--glass)" }}>
                  <ArrowUpCircle size={15} style={{ transform: "rotate(-90deg)" }} /> Retourner à "{savedShopName}"
                </button>
              )}
              <button onClick={openCreate} disabled={startingTrial} className="gb-focus w-full rounded-2xl py-3.5 px-4 flex items-center gap-3 text-left active:scale-[0.96] transition-transform disabled:opacity-60" style={{ background: "rgba(255,255,255,0.1)", border: "1.5px solid var(--cap)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.12)" }}><Store size={17} color="var(--cap)" /></div>
                <div className="min-w-0"><div className="text-white font-semibold text-sm">Créer une nouvelle entreprise</div><div className="text-white/50 text-[11px] mt-0.5">{startingTrial ? "Démarrage…" : !trialUsed ? `Essai gratuit ${TRIAL_DAYS} jours, configuration complète` : "Une autre entreprise, gérée séparément"}</div></div>
              </button>
              <button onClick={() => setMode("join")} className="gb-focus w-full rounded-2xl py-3.5 px-4 flex items-center gap-3 text-left active:scale-[0.96] transition-transform" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}><UserPlus size={17} color="var(--cap)" /></div>
                <div className="min-w-0"><div className="text-white font-semibold text-sm">Rejoindre une entreprise existante</div><div className="text-white/50 text-[11px] mt-0.5">Avec le code communiqué par l'administrateur</div></div>
              </button>
              <button onClick={() => setMode("reconnect")} className="gb-focus w-full rounded-2xl py-3.5 px-4 flex items-center gap-3 text-left active:scale-[0.96] transition-transform" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}><ShieldCheck size={17} color="var(--cap)" /></div>
                <div className="min-w-0"><div className="text-white font-semibold text-sm">Se reconnecter à mon entreprise</div><div className="text-white/50 text-[11px] mt-0.5">J'avais déjà accès, nouvel appareil</div></div>
              </button>
            </div>
          </div>

          <div className="px-6 py-4" style={{ background: "rgba(0,0,0,0.15)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-[10px] text-white/40 text-center mb-2">{TRIAL_DAYS} jours d'essai gratuit · Sans internet au quotidien</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setLegalDoc("terms")} className="gb-focus text-[10px] text-white/55 underline">Conditions d'utilisation</button>
              <span className="text-[10px] text-white/25">·</span>
              <button onClick={() => setLegalDoc("privacy")} className="gb-focus text-[10px] text-white/55 underline">Confidentialité</button>
            </div>
          </div>
        </div>
        {legalDoc && <LegalScreen doc={legalDoc} onSwitch={() => setLegalDoc(legalDoc === "terms" ? "privacy" : "terms")} onClose={() => setLegalDoc(null)} />}
        <SupportChatWidget shop={null} />
      </div>
    );
  }

  if (mode === "reconnect") {
    if (!reconnectRole) {
      return (
        <div className="min-h-full flex items-center justify-center px-5 py-10" style={{ background: "var(--glass)" }}>
          <div className="w-full max-w-xs rounded-[24px] p-7 gb-slide-up" style={{ background: "var(--glass-light)", boxShadow: "0 20px 44px -14px rgba(0,0,0,0.4)" }}>
            <div className="mx-auto mb-4 rounded-2xl overflow-hidden" style={{ width: 64, height: 64 }}><img src="/gestione-logo.webp" alt="GestiOne" className="w-full h-full object-cover" /></div>
            <h1 className="font-display font-bold text-xl text-white text-center mb-1">Se reconnecter</h1>
            <p className="text-white/55 text-xs text-center mb-7">Tu te connectes en tant que...</p>
            <div className="flex flex-col gap-2.5 mb-5">
              <button onClick={() => setReconnectRole("admin")} className="gb-focus w-full rounded-2xl py-3.5 px-4 flex items-center gap-3 text-left active:scale-[0.98] transition-transform" style={{ background: "rgba(255,255,255,0.1)", border: "1.5px solid var(--cap)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.12)" }}><ShieldCheck size={17} color="var(--cap)" /></div>
                <div className="text-white font-semibold text-sm">Administrateur</div>
              </button>
              <button onClick={() => setReconnectRole("vendeur")} className="gb-focus w-full rounded-2xl py-3.5 px-4 flex items-center gap-3 text-left active:scale-[0.98] transition-transform" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}><ShoppingCart size={17} color="var(--cap)" /></div>
                <div className="text-white font-semibold text-sm">Vendeur</div>
              </button>
            </div>
            <button onClick={() => (onCancel ? onCancel() : setMode(null))} className="gb-focus w-full flex items-center justify-center gap-1.5 text-white/45 text-xs"><ArrowUpCircle size={12} style={{ transform: "rotate(-90deg)" }} /> Retour</button>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-full flex items-center justify-center px-5 py-10" style={{ background: "var(--glass)" }}>
        <div className="w-full max-w-xs rounded-[24px] p-7 gb-slide-up" style={{ background: "var(--glass-light)", boxShadow: "0 20px 44px -14px rgba(0,0,0,0.4)" }}>
          <div className="mx-auto mb-4 rounded-2xl overflow-hidden" style={{ width: 56, height: 56 }}><img src="/gestione-logo.webp" alt="GestiOne" className="w-full h-full object-cover" /></div>
          <h1 className="font-display font-bold text-lg text-white text-center mb-6">{reconnectRole === "admin" ? "Reconnexion administrateur" : "Reconnexion vendeur"}</h1>
          <div className="flex flex-col gap-2.5">
            <input value={rcShopName} onChange={(e) => setRcShopName(e.target.value)} placeholder="Nom de l'entreprise" className="gb-input-dark gb-focus w-full rounded-xl px-4 py-3 text-sm outline-none border" style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.14)", color: "#fff" }} />
            <input value={rcVendorName} onChange={(e) => setRcVendorName(e.target.value)} placeholder={reconnectRole === "admin" ? "Nom d'un vendeur de ton entreprise" : "Ton nom"} className="gb-input-dark gb-focus w-full rounded-xl px-4 py-3 text-sm outline-none border" style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.14)", color: "#fff" }} />
            <input value={rcPin} onChange={(e) => setRcPin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder={reconnectRole === "admin" ? "Code administrateur" : "Ton code PIN"} inputMode="numeric" className="gb-input-dark gb-focus w-full rounded-xl px-4 py-3 text-sm font-mono outline-none border" style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.14)", color: "#fff" }} />
            {reconnectRole === "vendeur" && (
              <input value={rcJoinCode} onChange={(e) => setRcJoinCode(e.target.value.toUpperCase())} placeholder="Ton code de liaison" className="gb-input-dark gb-focus w-full rounded-xl px-4 py-3 text-sm font-mono tracking-wider outline-none border" style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.14)", color: "#fff" }} />
            )}
            <button onClick={submitReconnect} disabled={loading} className="gb-focus w-full rounded-2xl py-3.5 font-semibold text-sm disabled:opacity-50 mt-1.5" style={{ background: "var(--cap)", color: "var(--glass)" }}>
              {loading ? "Connexion…" : "Se reconnecter"}
            </button>
            <button onClick={() => setReconnectRole(null)} className="gb-focus flex items-center justify-center gap-1.5 text-white/45 text-xs mt-1"><ArrowUpCircle size={12} style={{ transform: "rotate(-90deg)" }} /> Retour</button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "join") {
    return (
      <div className="min-h-full flex items-center justify-center px-5 py-10" style={{ background: "var(--glass)" }}>
        <div className="w-full max-w-xs rounded-[24px] p-7 gb-slide-up" style={{ background: "var(--glass-light)", boxShadow: "0 20px 44px -14px rgba(0,0,0,0.4)" }}>
          <div className="mx-auto mb-4 rounded-2xl overflow-hidden" style={{ width: 64, height: 64 }}><img src="/gestione-logo.webp" alt="GestiOne" className="w-full h-full object-cover" /></div>
          <h1 className="font-display font-bold text-xl text-white text-center mb-1">Rejoindre une entreprise</h1>
          <p className="text-white/55 text-xs text-center mb-7 max-w-[240px] mx-auto">Entrez le code d'invitation communiqué par l'administrateur</p>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 7))}
            placeholder="Ex : LMK4X7Q"
            className="gb-input-dark gb-focus w-full rounded-xl px-4 py-3.5 text-lg font-mono text-center tracking-wider outline-none mb-3.5 border"
            style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.14)", color: "#fff" }}
          />
          <button onClick={submitJoin} disabled={loading} className="gb-focus w-full rounded-2xl py-3.5 font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50 mb-3.5" style={{ background: "var(--cap)", color: "var(--glass)" }}>
            {loading ? "Connexion…" : <>Rejoindre <ArrowUpCircle size={15} style={{ transform: "rotate(90deg)" }} /></>}
          </button>
          <button onClick={() => setMode(null)} className="gb-focus w-full flex items-center justify-center gap-1.5 text-white/45 text-xs mb-4"><ArrowUpCircle size={12} style={{ transform: "rotate(-90deg)" }} /> Retour</button>
          <div className="rounded-xl p-3 flex gap-2" style={{ background: "rgba(255,255,255,0.05)" }}>
            <Smartphone size={14} color="var(--cap)" className="shrink-0 mt-0.5" />
            <p className="text-white/50 text-[11px] leading-snug">Connexion internet nécessaire pour rejoindre une entreprise. L'app fonctionne ensuite hors-ligne au quotidien.</p>
          </div>
        </div>
      </div>
    );
  }

  const TYPE_ICONS = { maquis: Store, cave: Wine, buvette: GlassWater, bar: Beer };
  const STEP_META = {
    1: { eyebrow: "BIENVENUE SUR GESTIONE", title: "Comment s'appelle votre établissement ?", Icon: Store },
    2: { eyebrow: "ÉQUIPE", title: "Créez votre premier vendeur", Icon: UserPlus },
    3: { eyebrow: "DERNIÈRE ÉTAPE", title: "Choisissez votre devise", Icon: Banknote },
  };
  const meta = STEP_META[step];

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-4 py-8" style={{ background: "var(--glass)" }}>
      <div className="w-full max-w-xs rounded-[22px] overflow-hidden gb-slide-up" key={"card" + step} style={{ boxShadow: "0 16px 40px -12px rgba(0,0,0,0.35)" }}>
        <div className="px-5 pt-4 pb-0">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => (step > 1 ? setStep(step - 1) : (onCancel ? onCancel() : setMode(null)))} className="gb-focus w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <ArrowUpCircle size={15} color="#fff" style={{ transform: "rotate(-90deg)" }} />
            </button>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((i) => (
                <span key={i} className="h-[3px] rounded-full transition-all" style={{ width: i === step ? 18 : 5, background: i <= step ? "#5DCAA5" : "rgba(255,255,255,0.15)" }} />
              ))}
            </div>
            <span className="text-[10px] font-mono font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>0{step}/03</span>
          </div>
        </div>

        <div className="rounded-t-[26px] px-5 pt-7 pb-6" style={{ background: "var(--card)", marginTop: 14 }}>
          <div className="w-[46px] h-[46px] rounded-2xl flex items-center justify-center mb-3.5" style={{ background: "linear-gradient(135deg, #1D9E75, #0F6E56)" }}>
            <meta.Icon size={22} color="#fff" />
          </div>
          <p className="text-[11px] font-bold opacity-40 tracking-wide mb-1">{meta.eyebrow}</p>
          <h1 className="font-display font-bold text-lg mb-5 leading-snug">{meta.title}</h1>

          {step === 1 && (
            <>
              <p className="text-xs font-semibold opacity-60 mb-1.5">Nom de l'entreprise</p>
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Chez Mama, Le Maquis du Coin…" className="gb-focus w-full rounded-xl px-4 py-3 text-sm border mb-4" style={{ borderColor: "var(--line)" }} />
              <p className="text-xs font-semibold opacity-60 mb-2">Type d'établissement</p>
              <div className="grid grid-cols-2 gap-2 mb-2.5">
                {ESTABLISHMENT_TYPES.filter((t) => t.id !== "autre").map((t) => {
                  const TIcon = TYPE_ICONS[t.id] || Store;
                  const selected = type === t.id;
                  return (
                    <button key={t.id} onClick={() => setType(t.id)} className="gb-focus rounded-xl px-3 py-2.5 flex items-center gap-2 text-left" style={{ background: selected ? "#0F3D30" : "var(--paper-dim)", border: selected ? "1.5px solid #5DCAA5" : "1px solid var(--line)" }}>
                      <TIcon size={16} color={selected ? "#5DCAA5" : "var(--ink)"} />
                      <span className="text-[13px] font-semibold" style={{ color: selected ? "#5DCAA5" : "var(--ink)" }}>{t.label}</span>
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setType("autre")} className="gb-focus w-full rounded-xl px-3 py-2.5 flex items-center gap-2 text-left mb-3" style={{ background: "var(--paper-dim)", border: type === "autre" ? "1.5px solid #5DCAA5" : "1.5px dashed var(--line)" }}>
                <MoreHorizontalIcon />
                <span className="text-[13px] font-semibold">Autre</span>
              </button>
              {type === "autre" && (
                <div className="rounded-xl p-3 mb-2 gb-slide-up" style={{ background: "#E1F5EE" }}>
                  <p className="text-[11px] font-semibold mb-1.5" style={{ color: "#0F6E56" }}>Précisez le type de votre établissement</p>
                  <input autoFocus value={customType} onChange={(e) => setCustomType(e.target.value)} placeholder="Ex : Épicerie, Salon de thé, Pharmacie…" className="gb-focus w-full rounded-lg px-3 py-2 text-sm border" style={{ borderColor: "#9FE1CB", background: "var(--card)" }} />
                </div>
              )}
            </>
          )}
          {step === 2 && (
            <>
              <p className="text-xs font-semibold opacity-60 mb-1.5">Nom du vendeur</p>
              <input autoFocus value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Ex : Awa, Junior…" className="gb-focus w-full rounded-xl px-4 py-3 text-sm border mb-4" style={{ borderColor: "var(--line)" }} />
              <p className="text-xs font-semibold opacity-60 mb-1.5">Code d'accès (4 chiffres)</p>
              <input value={vendorPin} onChange={(e) => setVendorPin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" inputMode="numeric" className="gb-focus w-full rounded-xl px-4 py-3 text-lg font-mono text-center tracking-[0.4em] border mb-4" style={{ borderColor: "var(--line)" }} />
              <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: "#E1F5EE" }}>
                <MessageCircle size={14} color="#0F6E56" className="shrink-0 mt-0.5" />
                <p className="text-[11px]" style={{ color: "#0F6E56" }}>Ce code permettra à ce vendeur de se connecter à la caisse. Vous pourrez en ajouter d'autres plus tard.</p>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <div className="flex flex-col gap-2 mb-3">
                {CURRENCIES.map((c) => (
                  <button key={c.code} onClick={() => setCurrency(c.code)} className="gb-focus w-full rounded-xl px-4 py-3 flex items-center justify-between text-left" style={{ background: currency === c.code ? "#0F3D30" : "var(--paper-dim)", border: currency === c.code ? "1.5px solid #5DCAA5" : "1px solid var(--line)" }}>
                    <span className="text-sm font-semibold" style={{ color: currency === c.code ? "#5DCAA5" : "var(--ink)" }}>{c.label}</span>
                    {currency === c.code && <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#5DCAA5" }}><Check size={12} color="#0b2e22" strokeWidth={3} /></span>}
                  </button>
                ))}
              </div>
              <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: "#FAEEDA" }}>
                <Smartphone size={14} color="#854F0B" className="shrink-0 mt-0.5" />
                <p className="text-[11px]" style={{ color: "#854F0B" }}>Connexion internet nécessaire pour cette dernière étape. L'app fonctionnera ensuite hors-ligne au quotidien.</p>
              </div>
            </>
          )}

          <button onClick={next} disabled={loading} className="gb-focus w-full rounded-xl py-3.5 font-semibold text-sm text-white flex items-center justify-center gap-2 mt-5 disabled:opacity-60" style={{ background: "#0F6E56" }}>
            {loading ? "Création…" : step < 3 ? "Continuer" : "Terminer la configuration"}
            {!loading && <ArrowUpCircle size={15} style={{ transform: "rotate(90deg)" }} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function MoreHorizontalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
    </svg>
  );
}

/* ---------- Écran de connexion ---------- */

function PinPad({ accent, onSubmit }) {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const submit = (val) => {
    const ok = onSubmit(val);
    if (!ok) { setShake(true); setTimeout(() => { setShake(false); setPin(""); }, 320); }
    else setPin("");
  };
  const press = (d) => {
    const next = pin.length < 4 ? pin + d : pin;
    setPin(next);
    if (next.length === 4) setTimeout(() => submit(next), 80);
  };
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];
  return (
    <div className={shake ? "gb-pop" : ""}>
      <div className="flex justify-center gap-3 mb-7">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="w-3.5 h-3.5 rounded-full border-2 transition-colors" style={{ borderColor: shake ? "var(--danger)" : accent, background: i < pin.length ? (shake ? "var(--danger)" : accent) : "transparent" }} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
        {keys.map((d, i) => d === "" ? <div key={i} /> : (
          <button key={i} onClick={() => (d === "del" ? setPin((p) => p.slice(0, -1)) : press(d))} className="gb-focus h-14 rounded-2xl text-lg font-mono font-semibold active:scale-95 transition-transform" style={{ background: "var(--paper-dim)", color: "var(--ink)" }}>
            {d === "del" ? "⌫" : d}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- Verrouillage automatique ----------
// Écran plein qui recouvre l'application après une période d'inactivité :
// seul l'utilisateur connecté peut le lever avec son propre code.
function LockScreen({ userName, onUnlock, onSwitchUser }) {
  return (
    <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center px-6 no-print" style={{ background: "#1F2A33", paddingTop: "max(24px, env(safe-area-inset-top))", paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
      <div className="w-16 h-16 rounded-[22px] flex items-center justify-center mb-4" style={{ background: "rgba(255,255,255,0.1)" }}><Lock size={28} color="#fff" /></div>
      <p className="font-display font-bold text-[23px] text-white text-center">Session verrouillée</p>
      <p className="text-[14px] text-center mt-1.5 mb-7" style={{ color: "#B7C0C8" }}>Aucune activité depuis un moment.<br />{userName ? `${userName}, entrez votre code pour continuer.` : "Entrez votre code pour continuer."}</p>
      <div className="w-full max-w-[320px]">
        <PinPad accent="#A6E07A" onSubmit={onUnlock} />
      </div>
      <button onClick={onSwitchUser} className="gb-focus mt-7 px-5 py-3 rounded-2xl text-[14px] font-semibold" style={{ color: "#fff", background: "rgba(255,255,255,0.08)" }}>Changer d'utilisateur</button>
    </div>
  );
}

// Demande le code administrateur avant une action sensible (supprimer ou
// modifier une vente, changer un prix, supprimer un produit).
function AdminCodeModal({ label, onSubmit, onCancel }) {
  return (
    <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center no-print" style={{ background: "rgba(22,32,42,0.6)" }} onClick={onCancel}>
      <div className="w-full max-w-[420px] rounded-t-[26px] sm:rounded-[26px] px-6 pt-5 gb-slide-up" style={{ background: "var(--paper)", paddingBottom: "max(24px, calc(env(safe-area-inset-bottom) + 16px))" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "#FFF1D6" }}><ShieldCheck size={20} color="#8A4B00" /></div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-[17px] leading-tight">Code administrateur</p>
            <p className="text-[13px] opacity-60">Requis pour : {label}</p>
          </div>
          <button onClick={onCancel} className="gb-focus w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }} aria-label="Annuler"><X size={18} /></button>
        </div>
        <PinPad accent="var(--glass)" onSubmit={onSubmit} />
      </div>
    </div>
  );
}

function LoginScreen({ shop, shops, activeShopId, onSwitchShop, vendors, onLogin, pushToast, onGoHome }) {
  const [mode, setMode] = useState(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const typeLabel = ESTABLISHMENT_TYPES.find((t) => t.id === shop.type)?.label || shop.type || "";
  const check = (pin) => {
    if (mode === "admin") {
      const valid = shop.backendLinked ? api.verifyPin(pin, shop.adminPinHash) : pin === (shop.adminPin || DEFAULT_ADMIN_PIN);
      if (valid) { onLogin("admin", shop.adminDisplayName?.trim() || "Administrateur"); return true; }
      pushToast("Code incorrect", "error"); return false;
    }
    const v = vendors.find((x) => (shop.backendLinked ? api.verifyPin(pin, x.pinHash) : x.pin === pin));
    if (v && v.blocked) { pushToast("Accès bloqué. Contacte le propriétaire de l'entreprise.", "error"); return false; }
    if (v) { onLogin("vendeur", v.name); return true; }
    pushToast("Code incorrect", "error"); return false;
  };
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-10" style={{ background: "var(--glass)" }}>
      {shops.length > 1 && !mode && (
        <div className="w-full max-w-xs mb-5 gb-slide-up">
          <button onClick={() => setSwitcherOpen((v) => !v)} className="gb-focus w-full flex items-center justify-center gap-1.5 text-white/50 text-[11px] font-mono py-1.5">
            <Store size={12} /> Changer d'entreprise <ChevronDown size={12} style={{ transform: switcherOpen ? "rotate(180deg)" : "none" }} />
          </button>
          {switcherOpen && (
            <div className="mt-1 rounded-2xl overflow-hidden gb-slide-up" style={{ background: "var(--glass-light)" }}>
              {shops.map((s) => (
                <button key={s.id} onClick={() => { onSwitchShop(s.id); setSwitcherOpen(false); }} className="gb-focus w-full text-left px-4 py-3 text-sm text-white flex items-center justify-between border-b border-white/5 last:border-0">
                  {s.name}
                  {s.id === activeShopId && <Check size={14} color="var(--cap)" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="mb-10 text-center">
        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--cap)" }}>
          <Beer size={30} color="var(--glass)" strokeWidth={2.2} />
        </div>
        <h1 className="font-display font-bold text-2xl text-white tracking-tight">{shop.name}</h1>
        <p className="text-white/60 text-sm mt-1">{typeLabel ? typeLabel + " · " : ""}Gestion de stock &amp; ventes</p>
      </div>
      {!mode ? (
        <div className="w-full max-w-xs flex flex-col gap-3 gb-slide-up">
          <button onClick={() => setMode("vendeur")} className="gb-focus w-full rounded-2xl py-4 px-5 flex items-center gap-3 text-left active:scale-[0.98] transition-transform" style={{ background: "var(--glass-light)" }}>
            <ShoppingCart size={20} color="var(--cap)" />
            <div><div className="text-white font-semibold text-sm">{(TRANSLATIONS[shop.language || "fr"] || TRANSLATIONS.fr).vendor}</div><div className="text-white/50 text-xs">Encaisser une vente</div></div>
          </button>
          <button onClick={() => setMode("admin")} className="gb-focus w-full rounded-2xl py-4 px-5 flex items-center gap-3 text-left active:scale-[0.98] transition-transform" style={{ background: "var(--glass-light)" }}>
            <ShieldCheck size={20} color="var(--cap)" />
            <div><div className="text-white font-semibold text-sm">{(TRANSLATIONS[shop.language || "fr"] || TRANSLATIONS.fr).administrator}</div><div className="text-white/50 text-xs">Stock, prix, rapports</div></div>
          </button>
          {((!shop.backendLinked && (!shop.adminPin || shop.adminPin === DEFAULT_ADMIN_PIN)) || (shop.backendLinked && api.verifyPin(DEFAULT_ADMIN_PIN, shop.adminPinHash))) && (
            <p className="text-white/30 text-[11px] text-center mt-3 font-mono">Code administrateur par défaut : 1234</p>
          )}
          {onGoHome && (
            <button onClick={onGoHome} className="gb-focus block mx-auto mt-5 text-white/50 text-xs underline">← Retour</button>
          )}
        </div>
      ) : (
        <div className="w-full gb-slide-up">
          <p className="text-white/70 text-sm text-center mb-6">Code {mode === "admin" ? "administrateur" : "vendeur"}</p>
          <PinPad accent="var(--cap)" onSubmit={check} />
          <button onClick={() => setMode(null)} className="gb-focus block mx-auto mt-7 text-white/50 text-xs underline">Retour</button>
        </div>
      )}
      <p className="text-white/20 text-[10px] text-center mt-10 font-mono tracking-wide">GESTIONE — VENTE &amp; GESTION</p>
    </div>
  );
}

/* ---------- Écran de vente ---------- */

/* ---------- Scanner caméra ---------- */

function CameraScanner({ onDetect, onClose }) {
  const videoRef = useRef(null);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let stream = null;
    let rafId = null;
    let stopped = false;
    let detector = null;

    async function start() {
      if (!("BarcodeDetector" in window)) { setSupported(false); return; }
      try {
        detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "codabar", "itf"] });
      } catch { setSupported(false); return; }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const scan = async () => {
          if (stopped) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes && codes.length > 0) { onDetect(codes[0].rawValue); return; }
          } catch { /* image pas encore prête, on continue */ }
          rafId = requestAnimationFrame(scan);
        };
        rafId = requestAnimationFrame(scan);
      } catch {
        setError("Impossible d'accéder à la caméra. Vérifiez les autorisations de l'application.");
      }
    }
    start();
    return () => {
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [onDetect]);

  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col no-print">
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.25)" }} />

      {supported && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-72 h-44">
            <div className="absolute inset-0 rounded-2xl border-2" style={{ borderColor: "var(--cap)" }} />
            <div className="gb-scan-line" />
          </div>
        </div>
      )}

      <div className="relative z-10 flex items-center justify-between p-4">
        <button onClick={onClose} className="gb-focus w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}><X size={20} color="#fff" /></button>
        <p className="text-white text-sm font-semibold">Scanner un code-barre</p>
        <div className="w-10" />
      </div>

      <div className="relative z-10 mt-auto p-6">
        {!supported && (
          <div className="rounded-2xl p-4 bg-white gb-pop">
            <p className="text-sm font-semibold mb-1">Scanner caméra non disponible</p>
            <p className="text-xs opacity-60">Cet appareil ou ce navigateur ne supporte pas la détection de code-barre en direct. Utilisez une douchette Bluetooth ou la saisie manuelle du code.</p>
            <button onClick={onClose} className="gb-focus w-full mt-3 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: "var(--glass)" }}>Fermer</button>
          </div>
        )}
        {error && (
          <div className="rounded-2xl p-4 bg-white gb-pop">
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--danger)" }}>{error}</p>
            <button onClick={onClose} className="gb-focus w-full mt-3 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: "var(--glass)" }}>Fermer</button>
          </div>
        )}
        {supported && !error && <p className="text-white/70 text-xs text-center">Placez le code-barre à l'intérieur du cadre</p>}
      </div>
    </div>
  );
}

function ClientPicker({ clients, value, onChange, onCreateClient, focusSignal }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const selected = clients.find((c) => c.id === value);
  const matches = query.trim() ? clients.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 5) : [];
  const exactMatch = clients.some((c) => c.name.toLowerCase() === query.trim().toLowerCase());

  // Amène le curseur directement dans ce champ quand la validation du
  // paiement échoue faute de client renseigné — la vendeuse n'a plus besoin
  // de chercher où taper, elle peut saisir tout de suite.
  useEffect(() => {
    if (focusSignal) inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (focusSignal) inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSignal]);

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-xl px-3 py-2.5 border mb-2" style={{ borderColor: "var(--line)" }}>
        <span className="text-sm font-medium">{selected.name}{selected.phone ? ` · ${selected.phone}` : ""}</span>
        <button onClick={() => { onChange(null, ""); setQuery(""); }} className="gb-focus text-xs opacity-50 underline shrink-0 ml-2">Changer</button>
      </div>
    );
  }

  const submitTyped = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (exactMatch) {
      const match = clients.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
      onChange(match.id, match.name);
    } else {
      const id = onCreateClient(trimmed);
      onChange(id, trimmed);
    }
    setQuery("");
  };

  return (
    <div className="mb-2">
      <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitTyped()} placeholder="Rechercher ou ajouter un client" className="gb-focus w-full rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} />
      {query.trim() && (
        <div className="mt-1.5 rounded-xl border overflow-hidden gb-slide-up" style={{ borderColor: "var(--line)" }}>
          {matches.map((c) => (
            <button key={c.id} onClick={() => { onChange(c.id, c.name); setQuery(""); }} className="gb-focus w-full text-left px-3 py-2 text-sm border-b last:border-0" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
              {c.name}{c.phone ? ` · ${c.phone}` : ""}
            </button>
          ))}
          {!exactMatch && (
            <button
              onClick={() => { const id = onCreateClient(query.trim()); onChange(id, query.trim()); setQuery(""); }}
              className="gb-focus w-full text-left px-3 py-2 text-sm flex items-center gap-1.5 font-semibold"
              style={{ color: "var(--glass)", background: "var(--paper-dim)" }}
            >
              <UserPlus size={13} /> Ajouter "{query.trim()}" comme nouveau client
            </button>
          )}
          {exactMatch && (
            <p className="text-[10px] px-3 py-2 opacity-50">Ce nom existe déjà — sélectionnez-le ci-dessus au lieu d'en créer un autre.</p>
          )}
        </div>
      )}
    </div>
  );
}

// Reçu de vente réutilisable — utilisé après un encaissement (SellScreen) et
// pour réimprimer une vente déjà enregistrée depuis l'historique
// (HistoryScreen). Gère lui-même l'impression Bluetooth/navigateur, le
// partage et l'envoi WhatsApp.
function SaleReceiptModal({ receipt, shop, clients, onClose, pushToast }) {
  const fmt = useFmt();
  const [printing, setPrinting] = useState(false);
  const notify = (msg, type) => { if (pushToast) pushToast(msg, type); };

  // Impression déléguée à RawBT (app tierce dédiée à l'impression
  // Bluetooth/ESC-POS) — voir printer.js pour le détail et pourquoi ce choix.
  const handlePrintReceipt = async () => {
    if (!isPrinterFeatureAvailable()) {
      try {
        await shareText(`Reçu — ${shop.name}`, buildReceiptText(receipt, shop, fmt));
      } catch (e) {
        notify(e.message || "Impossible de partager le reçu.", "error");
      }
      return;
    }
    setPrinting(true);
    try {
      await printReceipt(receipt, shop, fmt);
    } catch (e) {
      notify(e.message || "Impossible d'imprimer — vérifiez que RawBT est installé et configuré.", "error");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/50 no-print" onClick={onClose} />
      <div className="relative w-full max-w-xs bg-white rounded-t-2xl gb-pop flex flex-col overflow-hidden" style={{ maxHeight: "85vh" }}>
      <div id="receipt-print-area" className="overflow-y-auto gb-scroll ticket-edge px-5 pt-5" style={{ paddingBottom: 24 }}>
        <div className="text-center">
          <Receipt size={18} className="mx-auto mb-1.5" style={{ color: receipt.isProductAvoir ? "#534AB7" : "var(--glass)" }} />
          <p className="font-display font-bold text-[12px] tracking-[0.18em] uppercase" style={{ color: receipt.isProductAvoir ? "#534AB7" : "var(--glass)" }}>{receipt.isProductAvoir ? (receipt.avoirMonnaie ? "Avoir produit + monnaie" : "Avoir produit") : "Reçu de vente"}</p>
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono opacity-45 mt-3">
          <span>N° {receiptNumber(receipt.id)}</span>
          <span>{new Date(receipt.date).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] mt-1.5">
          <span className="opacity-50">Servi par</span>
          <span className="font-semibold">{receipt.vendor}</span>
        </div>

        <div className="border-t border-dashed my-3" style={{ borderColor: "var(--line)" }} />

        <div className="flex flex-col gap-2.5">
          {receipt.items.map((i) => (
            <div key={i.id}>
              <div className="flex justify-between gap-2 text-xs font-medium">
                <span className="flex-1">{i.product.name}</span>
                <span className="font-mono shrink-0">{fmt(computeItemTotal(i.product, i.qty))}</span>
              </div>
              <div className="text-[10px] font-mono opacity-45 mt-0.5">
                {i.qty} × {fmt(i.product.price)}
                {i.product.bulkQty > 0 && i.product.bulkPrice > 0 && i.qty >= i.product.bulkQty ? ` (lot de ${i.product.bulkQty} à ${fmt(i.product.bulkPrice)})` : ""}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed my-3" style={{ borderColor: "var(--line)" }} />

        <div className="flex justify-between items-baseline">
          <span className="text-[11px] font-semibold uppercase tracking-wide opacity-50">{receipt.isProductAvoir ? "Valeur en avoir" : "Total"}</span>
          <span className="font-display font-bold text-2xl" style={{ color: receipt.isProductAvoir ? "#534AB7" : "var(--glass)" }}>{fmt(receipt.total)}</span>
        </div>
        {!receipt.isProductAvoir && (
          <div className="flex justify-between text-[11px] font-mono mt-2 opacity-60">
            <span>{PAYMENT_LABELS[receipt.paymentMethod]}</span>
            {receipt.paymentMethod === "credit" && <span>{receipt.clientName}</span>}
          </div>
        )}
        {receipt.amountReceived != null && (
          <>
            <div className="flex justify-between text-[11px] font-mono mt-1.5 opacity-60">
              <span>Montant reçu</span>
              <span>{fmt(receipt.amountReceived)}</span>
            </div>
            {receipt.paymentMethod === "credit" && receipt.total > receipt.amountReceived ? (
              <div className="flex justify-between text-[12px] font-mono font-bold mt-1" style={{ color: "var(--danger)" }}>
                <span>Reste à payer</span>
                <span>{fmt(receipt.total - receipt.amountReceived)}</span>
              </div>
            ) : !receipt.avoirMonnaie ? (
              <div className="flex justify-between text-[12px] font-mono font-bold mt-1">
                <span>Monnaie rendue</span>
                <span>{fmt(receipt.changeDue)}</span>
              </div>
            ) : null}
          </>
        )}
        {receipt.paymentMethod === "credit" && receipt.total > (receipt.amountReceived || 0) && (
          <div className="rounded-xl p-3 mt-3 gb-slide-up" style={{ background: "#FCEBE8" }}>
            <p className="text-[12px] font-bold" style={{ color: "var(--danger)" }}>Solde en crédit : {fmt(receipt.total - (receipt.amountReceived || 0))}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "#8C3A2C" }}>Client : {receipt.clientName || "Client"} — visible dans Crédits clients jusqu'au règlement complet.</p>
          </div>
        )}

        {receipt.avoirMonnaie && (
          <div className="rounded-xl p-3 mt-3 gb-slide-up" style={{ background: "#FAEEDA" }}>
            <p className="text-[12px] font-bold" style={{ color: "#412402" }}>Monnaie en avoir : {fmt(receipt.avoirAmount)}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "#633806" }}>Client : {receipt.avoirClientName || receipt.clientName || "Client"} — à récupérer lors d'un prochain passage.</p>
          </div>
        )}
        {(receipt.isProductAvoir || receipt.hasProductAvoir) && (
          <div className="rounded-xl p-3 mt-3 gb-slide-up" style={{ background: "#EEEDFE" }}>
            <p className="text-[12px] font-bold" style={{ color: "#26215C" }}>Client : {receipt.avoirClientName || receipt.clientName || "Client"}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "#3C3489" }}>Ces produits sont en avoir : à retirer ou à consommer sur place lors d'un prochain passage.</p>
          </div>
        )}

        <div className="border-t border-dashed my-3" style={{ borderColor: "var(--line)" }} />

        <ReceiptCodes id={receipt.id} label={`N° ${receiptNumber(receipt.id)}`} />

        <div className="text-center">
          <p className="font-display font-bold text-[15px]" style={{ color: "var(--glass)" }}>{shop.name}</p>
          <p className="text-[11px] italic opacity-55 mt-1.5 leading-snug">Merci pour votre confiance.<br />À très bientôt !</p>
        </div>
      </div>

      <div className="px-5 pt-3 no-print" style={{ borderTop: "1px solid var(--line)", paddingBottom: "max(18px, env(safe-area-inset-bottom))" }}>
        <div className="flex gap-2">
          <button onClick={onClose} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--paper-dim)" }}>Fermer</button>
          <button onClick={handlePrintReceipt} disabled={printing} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-1.5 disabled:opacity-60" style={{ background: "var(--glass)" }}>
            <Printer size={14} /> {printing ? "Impression…" : "Imprimer"}
          </button>
        </div>
        <div className="flex gap-2 mt-2">
          {typeof navigator !== "undefined" && navigator.share && (
            <button
              onClick={() => {
                const text = buildReceiptText(receipt, shop, fmt);
                navigator.share({ title: `Reçu — ${shop.name}`, text }).catch(() => {});
              }}
              className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5"
              style={{ background: "var(--paper-dim)" }}
            >
              <Download size={14} className="rotate-180" /> Partager
            </button>
          )}
          <button
            onClick={() => {
              const knownPhone = clients.find((c) => c.id === receipt.clientId)?.phone;
              const phone = knownPhone || window.prompt("Numéro WhatsApp du client (avec indicatif pays) :");
              if (!phone) return;
              const text = buildReceiptText(receipt, shop, fmt);
              window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`, "_blank");
            }}
            className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-1.5"
            style={{ background: "#25D366" }}
          >
            💬 WhatsApp
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

function SellScreen({ shop, categories, products, sales, clients, onCreateClient, cart, setCart, onCheckout, onCreateMoneyAvoir, onCreateProductAvoir, onCreateProductAndMoneyAvoir, pushToast, hasCashToday, onRequireCash }) {
  const fmt = useFmt();
  const [barcode, setBarcode] = useState("");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [showCart, setShowCart] = useState(false);
  const [payment, setPayment] = useState("especes");
  const [amountReceived, setAmountReceived] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState(null);
  const [avoirMonnaie, setAvoirMonnaie] = useState(false);
  const [avoirProduit, setAvoirProduit] = useState(false);
  const [avoirClientName, setAvoirClientName] = useState("");
  const [clientFocusSignal, setClientFocusSignal] = useState(0);
  const [receipt, setReceipt] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);


  // Reconnaissance vocale pour la recherche de produit. Même piège que pour
  // l'annonce vocale (speak()) et l'impression Bluetooth : l'API web native
  // (SpeechRecognition/webkitSpeechRecognition) n'est généralement PAS
  // implémentée dans la webview Android de Capacitor, même si elle marche
  // dans un vrai navigateur Chrome — d'où "Recherche vocale interrompue"
  // immédiat. On passe par le plugin Capacitor dédié, qui utilise le vrai
  // moteur de reconnaissance vocale d'Android.
  //
  // INSTALLATION REQUISE (à faire une fois, côté projet) :
  //   npm install @capgo/capacitor-speech-recognition
  //   npx cap sync
  // ATTENTION : @capacitor-community/speech-recognition (l'ancien nom) est
  // resté bloqué à Capacitor 7 et casse la compilation Java sur un projet
  // Capacitor 8 (erreur "compileDebugJavaWithJavac FAILED") — @capgo est le
  // successeur maintenu qui suit les versions de Capacitor, avec la même
  // API (migration directe, rien d'autre à changer dans ce fichier).
  // + déclarer la permission microphone dans AndroidManifest.xml si ce
  //   n'est pas déjà fait par le plugin lui-même (il l'ajoute normalement
  //   automatiquement lors du `cap sync`).
  const startVoiceSearch = async () => {
    try {
      const { SpeechRecognition } = await import("@capgo/capacitor-speech-recognition");
      const { available } = await SpeechRecognition.available();
      if (!available) { pushToast("Recherche vocale non disponible sur cet appareil", "error"); return; }
      const perm = await SpeechRecognition.requestPermissions();
      if (perm.speechRecognition !== "granted") { pushToast("Autorisation microphone refusée", "error"); return; }
      setListening(true);
      SpeechRecognition.addListener("partialResults", () => {});
      const result = await SpeechRecognition.start({ language: "fr-FR", maxResults: 1, prompt: "Dites le nom du produit…", popup: false });
      setListening(false);
      const transcript = result?.matches?.[0];
      if (transcript) { setQuery(transcript); setCat("all"); }
    } catch (e) {
      setListening(false);
      // Repli navigateur (aperçu web hors app native) : l'API standard, qui
      // fonctionne correctement dans un vrai navigateur.
      const WebSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!WebSpeechRecognition) { pushToast("Recherche vocale non disponible sur cet appareil", "error"); return; }
      const recognition = new WebSpeechRecognition();
      recognition.lang = "fr-FR";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => setListening(true);
      recognition.onend = () => setListening(false);
      recognition.onerror = () => { setListening(false); pushToast("Recherche vocale interrompue", "error"); };
      recognition.onresult = (evt) => {
        const transcript = evt.results[0][0].transcript;
        setQuery(transcript);
        setCat("all");
      };
      recognition.start();
    }
  };

  const addToCart = (product, silent) => {
    if (product.stock <= 0) { pushToast(`${product.name} — rupture de stock`, "error"); playSound("error", shop.soundsEnabled); return; }
    setCart((c) => {
      const existing = c.find((i) => i.id === product.id);
      const qtyInCart = existing ? existing.qty : 0;
      if (qtyInCart >= product.stock) { pushToast("Stock insuffisant", "error"); playSound("error", shop.soundsEnabled); return c; }
      if (existing) return c.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      return [...c, { id: product.id, qty: 1 }];
    });
    playSound("add", shop.soundsEnabled);
    if (!silent) pushToast(`${product.name} ajouté`, "ok");
  };

  const lookupAndAdd = (code) => {
    const found = products.find((p) => p.barcode === code);
    if (found) addToCart(found);
    else pushToast(`Aucun produit pour ${code}`, "error");
  };

  const handleScan = (e) => {
    if (e.key !== "Enter") return;
    const code = barcode.trim();
    setBarcode("");
    if (!code) return;
    lookupAndAdd(code);
  };

  const handleCameraDetect = (code) => {
    setScannerOpen(false);
    lookupAndAdd(code);
  };

  const filtered = products.filter((p) => {
    if (cat !== "all" && p.category !== cat) return false;
    if (query && !p.name.toLowerCase().includes(query.toLowerCase()) && !(p.barcode || "").toLowerCase().includes(query.trim().toLowerCase())) return false;
    return true;
  });

  const popularIds = (() => {
    const counts = {};
    (sales || []).forEach((s) => s.items.forEach((i) => { counts[i.id] = (counts[i.id] || 0) + i.qty; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
  })();
  const quickPicks = products.filter((p) => p.favorite || popularIds.includes(p.id)).slice(0, 10);

  const cartItems = cart.map((i) => ({ ...i, product: products.find((p) => p.id === i.id) })).filter((i) => i.product);
  const total = cartItems.reduce((s, i) => s + computeItemTotal(i.product, i.qty), 0);
  const count = cartItems.reduce((s, i) => s + i.qty, 0);

  const changeQty = (id, delta) => {
    setCart((c) => {
      const item = c.find((i) => i.id === id);
      const product = products.find((p) => p.id === id);
      const nextQty = item.qty + delta;
      if (nextQty <= 0) return c.filter((i) => i.id !== id);
      if (product && nextQty > product.stock) { pushToast("Stock insuffisant", "error"); return c; }
      return c.map((i) => (i.id === id ? { ...i, qty: nextQty } : i));
    });
  };

  // Conditions d'activation des puces avoir :
  // - "Avoir monnaie" (espèces uniquement) exige un montant reçu strictement
  //   supérieur au total — sans monnaie à rendre, il n'y a rien à mettre en avoir.
  // - "Avoir produit" exige un montant reçu saisi en espèces, OU simplement
  //   le mode Mobile Money (le client a payé intégralement par mobile,
  //   seuls les produits restent à remettre plus tard).
  const canAvoirMonnaie = payment === "especes" && amountReceived !== "" && Number(amountReceived) > total;
  const canAvoirProduit = payment === "especes" ? amountReceived !== "" : payment === "mobile";
  // Vente en espèces avec un montant reçu insuffisant : au lieu de bloquer,
  // on propose d'enregistrer automatiquement la différence en crédit client
  // (dès lors qu'un client est renseigné et qu'aucune puce avoir n'est active).
  const cashShortfall = payment === "especes" && amountReceived !== "" && Number(amountReceived) < total;

  // Si les conditions ne sont plus réunies (changement de mode de paiement,
  // montant reçu effacé ou modifié), on désactive automatiquement la puce
  // concernée pour ne jamais garder un état incohérent.
  useEffect(() => { if (avoirMonnaie && !canAvoirMonnaie) setAvoirMonnaie(false); }, [canAvoirMonnaie, avoirMonnaie]);
  useEffect(() => { if (avoirProduit && !canAvoirProduit) setAvoirProduit(false); }, [canAvoirProduit, avoirProduit]);

  const toggleAvoirMonnaie = () => {
    if (!avoirMonnaie && !canAvoirMonnaie) {
      pushToast("Saisissez un montant reçu (en espèces) supérieur au total pour activer l'avoir monnaie", "error");
      return;
    }
    setAvoirMonnaie((v) => !v);
  };
  const toggleAvoirProduit = () => {
    if (!avoirProduit && !canAvoirProduit) {
      pushToast(payment === "mobile" ? "Activez l'avoir produit après avoir choisi Mobile Money" : "Saisissez le montant reçu du client pour activer l'avoir produit", "error");
      return;
    }
    setAvoirProduit((v) => !v);
  };

  const confirmCheckout = () => {
    // Le fond de caisse du jour doit être renseigné avant toute vente —
    // vérifié ici en tout premier, avant n'importe quelle autre validation.
    if (!hasCashToday) { onRequireCash?.(); return; }
    if (payment === "credit" && !clientId) { pushToast("Sélectionnez ou ajoutez un client pour le crédit", "error"); setClientFocusSignal((n) => n + 1); return; }
    if (avoirMonnaie && !canAvoirMonnaie) { pushToast("Le montant reçu doit être supérieur au total pour l'avoir monnaie", "error"); return; }
    if (avoirProduit && !canAvoirProduit) { pushToast("Saisissez le montant reçu du client pour l'avoir produit", "error"); return; }
    if ((avoirMonnaie || avoirProduit) && !avoirClientName.trim() && !clientName.trim()) { pushToast("Indiquez le nom du client pour l'avoir", "error"); return; }
    const avoirClient = avoirClientName.trim() || clientName.trim();

    // Montant reçu (espèces) insuffisant, sans puce avoir active : la vente
    // est enregistrée comme un crédit client, avec le montant déjà reçu
    // compté comme premier règlement — le solde restant apparaît normalement
    // dans "Crédits clients".
    if (cashShortfall && !avoirMonnaie && !avoirProduit) {
      if (!clientId && !clientName.trim()) { pushToast("Indiquez le nom du client pour enregistrer le solde restant en crédit", "error"); setClientFocusSignal((n) => n + 1); return; }
      const received = Number(amountReceived);
      const sale = onCheckout(cartItems, total, "credit", clientId, clientName || "Client", received, received);
      playSound("sale", shop.soundsEnabled);
      speak(`Vente enregistrée en crédit partiel. ${spokenAmount(fmt(total - received))} restant à payer.`, voiceOn(shop, "sale"));
      setReceipt(sale);
      setShowCart(false);
      resetCheckoutFields();
      return;
    }
    if (cashShortfall && (avoirMonnaie || avoirProduit)) { pushToast("Le montant reçu est inférieur au total", "error"); return; }

    const receivedAmount = payment === "especes" && amountReceived !== "" ? Number(amountReceived) : (payment === "mobile" && avoirProduit ? total : null);
    const changeDue = receivedAmount != null ? Math.max(0, receivedAmount - total) : 0;

    // Mobile Money + avoir produit : le client a intégralement payé par
    // mobile (vente normale, comptée en recette), seuls les produits restent
    // à lui remettre plus tard — enregistrés en avoir, sans redécompter le
    // stock déjà décompté par la vente.
    if (avoirProduit && payment === "mobile") {
      const sale = onCheckout(cartItems, total, "mobile", clientId, clientName || avoirClient, receivedAmount);
      onCreateProductAvoir(cartItems, avoirClient, { skipStock: true, saleId: sale?.id });
      playSound("sale", shop.soundsEnabled);
      speak(`Vente enregistrée, ${spokenAmount(fmt(total))}. Produits en avoir pour ${avoirClient}.`, voiceOn(shop, "sale"));
      setReceipt({ ...sale, hasProductAvoir: true, avoirClientName: avoirClient, changeDue: 0 });
      setShowCart(false);
      resetCheckoutFields();
      return;
    }

    // Avoir produit en espèces (seul ou combiné avec avoir monnaie) : les
    // articles du panier sont dus au client, pas vendus maintenant — ça
    // remplace la vente normale, pas de recette comptée. Si en plus l'avoir
    // monnaie est actif, la monnaie non rendue est aussi enregistrée comme
    // somme due, et le reçu affiche les deux messages. Les deux avoirs sont
    // créés en un seul appel atomique (voir onCreateProductAndMoneyAvoir) —
    // deux appels séparés se marchaient dessus l'un l'autre.
    if (avoirProduit) {
      const hasMoney = avoirMonnaie && changeDue > 0;
      const { productAvoir, moneyAvoir } = hasMoney
        ? onCreateProductAndMoneyAvoir(cartItems, changeDue, avoirClient)
        : { productAvoir: onCreateProductAvoir(cartItems, avoirClient), moneyAvoir: null };
      playSound("sale", shop.soundsEnabled);
      speak(`Avoir enregistré pour ${avoirClient}.`, voiceOn(shop, "credit"));
      setShowCart(false);
      setReceipt({
        isProductAvoir: true,
        avoirMonnaie: !!moneyAvoir,
        avoirAmount: changeDue,
        id: productAvoir?.id || uid(),
        date: productAvoir?.date || new Date().toISOString(),
        items: cartItems,
        total,
        amountReceived: receivedAmount,
        // La monnaie ne s'annule que si l'avoir monnaie est aussi actif (la
        // différence devient alors une somme due, pas rendue en espèces).
        // Sinon (avoir produit seul), le client reçoit sa vraie monnaie et
        // le reçu doit l'afficher, comme pour une vente normale.
        changeDue: hasMoney ? 0 : changeDue,
        clientName: avoirClient,
        avoirClientName: avoirClient,
        vendor: productAvoir?.vendor || "",
      });
      resetCheckoutFields();
      return;
    }

    const sale = onCheckout(cartItems, total, payment, clientId, clientName || "Client", receivedAmount);
    // Avoir monnaie : la vente est normale (le client a bien payé), seule la
    // monnaie qui n'a pas pu être rendue devient une somme due, à part.
    if (avoirMonnaie && changeDue > 0) {
      onCreateMoneyAvoir(changeDue, avoirClient, sale?.id);
    }
    playSound("sale", shop.soundsEnabled);
    speak(avoirMonnaie && changeDue > 0 ? `Vente enregistrée, ${spokenAmount(fmt(total))}. Monnaie en avoir pour ${avoirClient}.` : `Vente enregistrée, ${spokenAmount(fmt(total))}.`, voiceOn(shop, "sale"));
    setReceipt(avoirMonnaie && changeDue > 0 ? { ...sale, avoirMonnaie: true, avoirAmount: changeDue, avoirClientName: avoirClient, changeDue: 0 } : sale);
    setShowCart(false);
    resetCheckoutFields();
  };
  const resetCheckoutFields = () => {
    setPayment("especes");
    setClientName("");
    setClientId(null);
    setAmountReceived("");
    setAvoirMonnaie(false);
    setAvoirProduit(false);
    setAvoirClientName("");
    setCart([]);
  };

  const qtyInCart = (id) => cartItems.find((i) => i.id === id)?.qty || 0;
  const catColor = (catId) => { const c = getCategory(categories, catId).color || "#888888"; return /^#[0-9a-fA-F]{6}$/.test(c) ? c : "#888888"; };
  const catTint = (catId) => `${catColor(catId)}1F`;
  // Teinte foncée de la couleur de catégorie, pour les touches rapides
  // (texte blanc lisible dessus).
  const catKey = (catId) => {
    const h = catColor(catId);
    const f = 0.62;
    const ch = (i) => Math.round(parseInt(h.slice(i, i + 2), 16) * f).toString(16).padStart(2, "0");
    return `#${ch(1)}${ch(3)}${ch(5)}`;
  };
  const [favOpen, setFavOpen] = useState(() => { try { return localStorage.getItem("sell_fav_open") !== "0"; } catch { return true; } });
  const toggleFav = () => setFavOpen((v) => { const n = !v; try { localStorage.setItem("sell_fav_open", n ? "1" : "0"); } catch { /* ignore */ } return n; });
  const todayStr = new Date().toDateString();
  const todaySales = (sales || []).filter((x) => new Date(x.date).toDateString() === todayStr);
  const todayTotal = todaySales.reduce((sum, x) => sum + (Number(x.total) || 0), 0);
  const favorites = quickPicks.slice(0, 6);
  const searchKey = (e) => {
    if (e.key !== "Enter") return;
    const code = query.trim();
    if (!code) return;
    const exact = products.some((p) => (p.barcode || "").trim() === code);
    if (exact || /^\d{6,}$/.test(code)) { setQuery(""); lookupAndAdd(code); }
  };
  const shown = filtered;
  return (
    <div style={{ paddingBottom: "calc(190px + env(safe-area-inset-bottom))" }}>
      <section className="mx-3 mt-3 rounded-[24px] px-4 pt-4 pb-4 flex flex-col gap-3 text-white" style={{ background: "#1F2A33" }}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] capitalize" style={{ color: "#C9D1D8" }}>{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl px-3 py-2.5 flex flex-col gap-0.5 min-w-0" style={{ background: "rgba(255,255,255,0.07)" }}>
            <span className="text-[11.5px]" style={{ color: "#C9D1D8" }}>Ventes du jour</span>
            <span className="font-display font-bold text-[18px] whitespace-nowrap" style={{ color: "#A6E07A" }}>{fmt(todayTotal)}</span>
          </div>
          <div className="rounded-2xl px-3 py-2.5 flex flex-col gap-0.5 min-w-0" style={{ background: "rgba(255,255,255,0.07)" }}>
            <span className="text-[11.5px]" style={{ color: "#C9D1D8" }}>Tickets</span>
            <span className="font-display font-bold text-[18px]">{todaySales.length}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <label className="flex-1 min-w-0 flex items-center gap-2.5 min-h-[50px] pl-3.5 pr-1.5 rounded-2xl" style={{ background: "#fff" }}>
            <Search size={17} color="#5B6470" className="shrink-0" />
            <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={searchKey} placeholder="Produit ou code-barres" aria-label="Rechercher un produit ou saisir un code-barres" className="bg-transparent outline-none text-[15px] flex-1 min-w-0" style={{ color: "#16202A" }} />
            <button onClick={startVoiceSearch} className="gb-focus w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: listening ? "var(--danger)" : "#F0EFEA" }} aria-label="Recherche vocale">
              <Mic size={16} color={listening ? "#fff" : "#16202A"} className={listening ? "gb-pop" : ""} />
            </button>
          </label>
          <button onClick={() => setScannerOpen(true)} className="gb-focus shrink-0 min-h-[50px] px-3.5 rounded-2xl flex items-center gap-2 text-white text-[14px] font-bold" style={{ background: "#E8761C" }} aria-label="Scanner avec la caméra">
            <ScanLine size={19} color="#fff" /> Scanner
          </button>
        </div>
      </section>

      {scannerOpen && <CameraScanner onDetect={handleCameraDetect} onClose={() => setScannerOpen(false)} />}

      {favorites.length > 0 && !query && (
        <section className="px-4 mt-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="flex flex-col min-w-0">
              <span className="font-display font-bold text-[17px]">Touches rapides</span>
              <span className="text-[12.5px] opacity-60">{favOpen ? `Vos ${favorites.length} favoris` : `${favorites.length} favoris masqués`}</span>
            </span>
            <button onClick={toggleFav} aria-expanded={favOpen} aria-label={favOpen ? "Replier les touches rapides" : "Déplier les touches rapides"} className="gb-focus shrink-0 min-h-[40px] pl-3.5 pr-3 rounded-xl text-[13px] font-bold flex items-center gap-1.5" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>
              {favOpen ? "Replier" : "Déplier"}
              <ChevronDown size={16} style={{ transform: favOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
            </button>
          </div>
          {favOpen && (
            <div className="grid grid-cols-3 gap-2 gb-slide-up">
              {favorites.map((p) => {
                const n = qtyInCart(p.id);
                const out = p.stock <= 0;
                return (
                  <button key={p.id} onClick={() => addToCart(p)} disabled={out} aria-label={`Ajouter ${p.name}`} className="gb-focus relative min-w-0 min-h-[104px] p-2.5 pt-3 rounded-[18px] text-left text-white flex flex-col items-start justify-between gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-45" style={{ background: catKey(p.category), boxShadow: n ? "0 0 0 3px var(--paper), 0 0 0 5px #1E8E50" : "0 6px 14px rgba(22,32,42,0.15)" }}>
                    {n > 0 && <span className="absolute top-2 right-2 min-w-[24px] h-6 px-1.5 rounded-full text-[12px] font-bold flex items-center justify-center" style={{ background: "#fff", color: "#16202A" }}>×{n}</span>}
                    <span className="opacity-90"><CategoryIcon cat={p.category} categories={[{ ...getCategory(categories, p.category), color: "#FFFFFF" }]} size={19} /></span>
                    <span className="text-[14px] font-bold leading-tight break-words w-full">{p.name}</span>
                    <span className="font-display font-bold text-[15.5px] whitespace-nowrap">{fmt(p.price)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      <div role="tablist" aria-label="Catégories" className="mx-4 mt-4 p-1.5 rounded-[18px] grid gap-1" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(58px, 1fr))", background: "var(--card)", border: "1px solid var(--line)" }}>
        {["all", ...categories.map((c) => c.id)].map((c) => {
          const on = cat === c;
          return (
            <button key={c} onClick={() => setCat(c)} role="tab" aria-selected={on} className="gb-focus min-w-0 min-h-[56px] px-0.5 py-1.5 rounded-[13px] flex flex-col items-center justify-center gap-1" style={on ? { background: "#1F2A33", color: "#fff" } : { color: c === "all" ? "var(--ink)" : catColor(c) }}>
              {c === "all" ? <Layers size={18} /> : <CategoryIcon cat={c} categories={on ? [{ ...getCategory(categories, c), color: "#FFFFFF" }] : categories} size={18} />}
              <span className="text-[10.5px] font-bold leading-tight text-center break-words w-full">{c === "all" ? "Tout" : getCategory(categories, c).label}</span>
            </button>
          );
        })}
      </div>

      <div className="px-4 mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {shown.map((p) => {
          const n = qtyInCart(p.id);
          const out = p.stock <= 0;
          const low = !out && p.stock <= p.minStock;
          const left = p.stock - n;
          const stockColor = out ? "#8A2419" : low ? "#6E3C00" : "#0F4F2B";
          const dotColor = out ? "#C2331F" : low ? "#E09A1A" : "#1E8E50";
          const meta = getCategory(categories, p.category);
          return (
            <button key={p.id} onClick={() => addToCart(p)} disabled={out} aria-label={`Ajouter ${p.name} au panier`} className="gb-focus min-w-0 text-left rounded-[18px] overflow-hidden flex flex-col active:scale-[0.97] transition-transform disabled:opacity-55" style={{ background: "var(--card)", border: n ? "2px solid #1E8E50" : "1px solid var(--line)" }}>
              <span className="relative w-full h-[72px] flex items-center justify-center overflow-hidden" style={{ background: catTint(p.category) }}>
                {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : <CategoryIcon cat={p.category} categories={categories} size={26} />}
                <span className="absolute left-2 top-2 h-[22px] px-2 rounded-full text-[11px] font-bold flex items-center" style={{ background: "rgba(255,255,255,0.92)", color: catKey(p.category) }}>{meta.label}</span>
                {n > 0 && <span className="absolute right-2 top-2 min-w-[26px] h-[26px] px-1.5 rounded-full text-white text-[12.5px] font-bold flex items-center justify-center" style={{ background: "#1E8E50" }}>×{n}</span>}
              </span>
              <span className="px-3 pt-2.5 pb-3 flex flex-col gap-1 w-full">
                <span className="text-[15px] font-bold leading-tight break-words" style={{ color: "var(--ink)" }}>{p.name}</span>
                <span className="flex items-center justify-between gap-1.5 w-full">
                  <span className="font-display font-bold text-[16.5px] whitespace-nowrap" style={{ color: "var(--ink)" }}>{fmt(p.price)}</span>
                  <span className="w-8 h-8 shrink-0 rounded-[10px] flex items-center justify-center" style={{ background: out ? "#C9CDD2" : "#1F2A33" }}><Plus size={16} color="#fff" /></span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-[12px] font-bold" style={{ color: stockColor }}>
                  <span className="w-[7px] h-[7px] rounded-full" style={{ background: dotColor }} />
                  {out ? "Rupture" : left <= 0 ? "Tout au panier" : low ? `Plus que ${left}` : `${left} en stock`}
                </span>
                {p.bulkQty > 0 && p.bulkPrice > 0 && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full self-start" style={{ background: "var(--paper-dim)", color: "var(--glass)" }}>Lot de {p.bulkQty} = {fmt(p.bulkPrice)}</span>
                )}
              </span>
            </button>
          );
        })}
        {shown.length === 0 && (
          <div className="col-span-2 sm:col-span-3 lg:col-span-4 rounded-[18px] p-7 text-center flex flex-col gap-1.5" style={{ background: "var(--card)", border: "1px dashed var(--line)" }}>
            <span className="text-[15px] font-bold">Aucun produit trouvé</span>
            <span className="text-[13px] opacity-60">Vérifiez le nom ou scannez le code-barres.</span>
          </div>
        )}
      </div>

      {!showCart && (
        <div className="fixed left-3 right-3 z-30 gb-slide-up no-print mx-auto max-w-[600px]" style={{ bottom: "calc(88px + env(safe-area-inset-bottom))" }}>
          {count > 0 ? (
            <button onClick={() => setShowCart(true)} className="gb-focus w-full min-h-[64px] rounded-[20px] pl-4 pr-2 py-2 flex items-center gap-3 text-white" style={{ background: "#1E8E50", boxShadow: "0 12px 26px rgba(30,142,80,0.35)" }}>
              <span className="relative shrink-0 flex">
                <ShoppingCart size={24} color="#fff" />
                <span className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-bold flex items-center justify-center" style={{ background: "#fff", color: "#1E8E50" }}>{count}</span>
              </span>
              <span className="flex-1 min-w-0 flex flex-col items-start pl-1.5">
                <span className="text-[12px] font-semibold" style={{ color: "#D6F2E1" }}>{count} article{count > 1 ? "s" : ""}</span>
                <span className="font-display font-bold text-[20px] leading-tight">{fmt(total)}</span>
              </span>
              <span className="shrink-0 h-12 px-4 rounded-[14px] text-[15px] font-bold flex items-center gap-1.5 whitespace-nowrap" style={{ background: "#fff", color: "#0F4F2B" }}>Voir le panier <ChevronRight size={16} /></span>
            </button>
          ) : (
            <div className="min-h-[52px] px-4 py-2.5 rounded-[18px] flex items-center gap-2.5 text-[13.5px]" style={{ background: "var(--card)", border: "1px dashed var(--line)", color: "var(--ink)" }}>
              <ShoppingCart size={18} className="opacity-50 shrink-0" />
              <span className="opacity-70">Touchez une touche rapide ou un produit pour commencer</span>
            </div>
          )}
        </div>
      )}

      {showCart && (
        <div className="fixed inset-0 z-40 flex items-end no-print">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCart(false)} />
          <div className="relative w-full rounded-t-3xl p-5 gb-slide-up max-h-[85vh] flex flex-col" style={{ background: "var(--card)", paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-display font-bold text-[20px]">Panier · {count} article{count > 1 ? "s" : ""}</h2>
              <div className="flex items-center gap-2 shrink-0">
                {cartItems.length > 0 && <button onClick={() => { setCart([]); setShowCart(false); pushToast("Panier vidé", "ok"); }} className="gb-focus min-h-[38px] px-3 rounded-xl text-[13px] font-bold" style={{ border: "1px solid #EBB3AA", color: "#8A2419" }}>Vider</button>}
                <button onClick={() => setShowCart(false)} className="gb-focus w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--paper-dim)" }} aria-label="Fermer le panier"><X size={18} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto gb-scroll -mx-1 px-1">
              {cartItems.map((i) => (
                <div key={i.id} className="flex items-center gap-3 py-2.5 border-b" style={{ borderColor: "var(--line)" }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><CategoryIcon cat={i.product.category} categories={categories} size={15} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold break-words">{i.product.name}</div>
                    <div className="font-mono text-xs opacity-50">
                      {fmt(computeItemTotal(i.product, i.qty))}
                      {i.product.bulkQty > 0 && i.product.bulkPrice > 0 && i.qty >= i.product.bulkQty && (
                        <span style={{ color: "var(--cap)" }}> · lot appliqué</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center shrink-0 rounded-xl overflow-hidden" style={{ border: "1px solid var(--line)", background: "var(--paper-dim)" }}>
                    <button onClick={() => changeQty(i.id, -1)} className="gb-focus w-10 h-10 flex items-center justify-center" aria-label={`Diminuer ${i.product.name}`}>{i.qty <= 1 ? <Trash2 size={15} color="#B3261E" /> : <Minus size={15} />}</button>
                    <span className="font-display font-bold text-[16px] min-w-[30px] text-center">{i.qty}</span>
                    <button onClick={() => changeQty(i.id, 1)} className="gb-focus w-10 h-10 flex items-center justify-center" aria-label={`Augmenter ${i.product.name}`}><Plus size={15} /></button>
                  </div>
                </div>
              ))}
              {cartItems.length === 0 && <p className="text-center text-sm opacity-50 py-8">Panier vide.</p>}

              {cartItems.length > 0 && (
                <div className="pt-3">
                <p className="text-xs font-semibold opacity-60 mb-2">Mode de paiement</p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {PAYMENT_METHODS.map((m) => {
                    const on = payment === m.id;
                    const Icon = m.id === "especes" ? Banknote : m.id === "mobile" ? Smartphone : UserPlus;
                    return (
                      <button key={m.id} onClick={() => { setPayment(m.id); if (m.id !== "especes") setAmountReceived(""); }} aria-pressed={on} className="gb-focus min-w-0 min-h-[64px] px-1 py-2 rounded-2xl text-[12.5px] font-bold flex flex-col items-center justify-center gap-1.5 text-center transition-colors" style={on ? { background: "#1F2A33", color: "#fff", border: "1px solid #1F2A33" } : { background: "var(--card)", color: "var(--ink)", border: "1px solid var(--line)" }}>
                        <Icon size={20} />{m.label}
                      </button>
                    );
                  })}
                </div>
                {payment === "especes" && (
                  <div className="mb-3 gb-slide-up">
                    <p className="text-xs font-semibold opacity-60 mb-2">Montant reçu du client (optionnel)</p>
                    {total > 0 && (
                      <div className="grid grid-cols-3 gap-1.5 mb-2">
                        {[...new Set([total, ...[500, 1000, 2000, 5000, 10000].map((step) => Math.ceil(total / step) * step)])].slice(0, 6).map((v, idx) => (
                          <button key={v} onClick={() => setAmountReceived(String(v))} className="gb-focus min-w-0 min-h-[42px] px-1 rounded-xl text-[13px] font-bold" style={Number(amountReceived) === v ? { background: "#1E8E50", color: "#fff", border: "1px solid #1E8E50" } : { background: "var(--paper-dim)", color: "var(--ink)", border: "1px solid var(--line)" }}>{idx === 0 ? "Compte juste" : fmt(v)}</button>
                        ))}
                      </div>
                    )}
                    <input
                      type="number"
                      inputMode="decimal"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      placeholder={`${fmt(total)}`}
                      className="gb-focus w-full rounded-xl px-3 py-2.5 text-sm border font-mono mb-2"
                      style={{ borderColor: "var(--line)" }}
                    />
                    {amountReceived !== "" && (
                      Number(amountReceived) >= total ? (
                        <div className="rounded-xl px-3 py-2.5 flex items-center justify-between" style={{ background: "#E7F7EE" }}>
                          <span className="text-xs font-semibold" style={{ color: "#1CA857" }}>Monnaie à rendre</span>
                          <span className="font-mono font-bold text-sm" style={{ color: "#1CA857" }}>{fmt(Number(amountReceived) - total)}</span>
                        </div>
                      ) : (
                        <div className="rounded-xl px-3 py-2.5" style={{ background: "#FCEBE8" }}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold" style={{ color: "var(--danger)" }}>Montant insuffisant</span>
                            <span className="font-mono font-bold text-sm" style={{ color: "var(--danger)" }}>- {fmt(total - Number(amountReceived))}</span>
                          </div>
                          <p className="text-[10px] mt-1" style={{ color: "var(--danger)" }}>Sera enregistré en crédit client pour la différence — indiquez le nom du client ci-dessous.</p>
                        </div>
                      )
                    )}
                  </div>
                )}
                <p className="text-xs font-semibold opacity-60 mb-2">Client {(payment === "credit" || cashShortfall) ? "(requis)" : "(optionnel)"}</p>
                <ClientPicker clients={clients} value={clientId} onChange={(id, name) => { setClientId(id); setClientName(name); }} onCreateClient={onCreateClient} focusSignal={clientFocusSignal} />

                {payment !== "credit" && (payment === "mobile" || (amountReceived !== "" && Number(amountReceived) >= total)) && (
                  <div className="flex flex-col gap-2 mt-3">
                    {payment !== "mobile" && (
                      <>
                        <button
                          onClick={toggleAvoirMonnaie}
                          className="gb-focus w-full flex items-center justify-between px-3 py-2.5 rounded-xl"
                          style={{ background: "#FAEEDA", opacity: !avoirMonnaie && !canAvoirMonnaie ? 0.45 : 1, cursor: !avoirMonnaie && !canAvoirMonnaie ? "not-allowed" : "pointer" }}
                        >
                          <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#854F0B" }}><Coins size={13} /> Avoir monnaie</span>
                          <span className="w-9 h-5 rounded-full relative shrink-0 transition-colors" style={{ background: avoirMonnaie ? "#EF9F27" : "var(--line)" }}>
                            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: avoirMonnaie ? 18 : 2 }} />
                          </span>
                        </button>
                        {!avoirMonnaie && !canAvoirMonnaie && (
                          <p className="text-[10px] opacity-50 -mt-1.5 px-1">Montant reçu (espèces) supérieur au total requis</p>
                        )}
                      </>
                    )}
                    <button
                      onClick={toggleAvoirProduit}
                      className="gb-focus w-full flex items-center justify-between px-3 py-2.5 rounded-xl"
                      style={{ background: "#EEEDFE", opacity: !avoirProduit && !canAvoirProduit ? 0.45 : 1, cursor: !avoirProduit && !canAvoirProduit ? "not-allowed" : "pointer" }}
                    >
                      <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#26215C" }}><PackageX size={13} /> Avoir produit</span>
                      <span className="w-9 h-5 rounded-full relative shrink-0 transition-colors" style={{ background: avoirProduit ? "#7F77DD" : "var(--line)" }}>
                        <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: avoirProduit ? 18 : 2 }} />
                      </span>
                    </button>
                    {!avoirProduit && !canAvoirProduit && (
                      <p className="text-[10px] opacity-50 -mt-1.5 px-1">{payment === "mobile" ? "Renseignez le nom du client pour activer l'avoir produit" : "Montant reçu du client requis"}</p>
                    )}
                  </div>
                )}

                {(avoirMonnaie || avoirProduit) && (
                  <div className="mt-2.5 p-3 rounded-xl gb-slide-up" style={{ background: avoirProduit ? "#EEEDFE" : "#FAEEDA" }}>
                    <p className="text-[11px] font-semibold mb-1.5" style={{ color: avoirProduit ? "#26215C" : "#854F0B" }}>Nom du client (avoir)</p>
                    <input
                      value={avoirClientName}
                      onChange={(e) => setAvoirClientName(e.target.value)}
                      placeholder={clientName || "Ex : Edouard"}
                      className="gb-focus w-full rounded-lg px-3 py-2 text-sm border"
                      style={{ borderColor: avoirProduit ? "#AFA9EC" : "#FAC775", background: "var(--card)" }}
                    />
                  </div>
                )}
              </div>
            )}
            </div>

            <div className="pt-2 mt-1 border-t" style={{ borderColor: "var(--line)" }}>
              <div className="flex items-center justify-between mb-3 mt-3">
                <span className="text-sm opacity-60">Total</span>
                <span className="font-display font-bold text-xl">{fmt(total)}</span>
              </div>
              <button onClick={confirmCheckout} disabled={cartItems.length === 0} className="gb-focus w-full min-h-[56px] rounded-2xl py-3.5 font-bold text-[15px] disabled:opacity-40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2" style={{ background: avoirProduit ? "#534AB7" : "#1E8E50", color: "#fff", boxShadow: avoirProduit ? "none" : "0 10px 22px rgba(30,142,80,0.3)" }}>
                <Check size={19} />
                {avoirProduit ? (avoirMonnaie ? "Enregistrer l'avoir produit + monnaie" : "Enregistrer l'avoir produit") : (cashShortfall && !avoirMonnaie ? `Encaisser ${fmt(Number(amountReceived) || 0)} + crédit ${fmt(total - (Number(amountReceived) || 0))}` : `Encaisser ${fmt(total)}`)}
              </button>
            </div>
          </div>
        </div>
      )}

      {receipt && <SaleReceiptModal receipt={receipt} shop={shop} clients={clients} onClose={() => setReceipt(null)} pushToast={pushToast} />}
    </div>
  );
}

/* ---------- Écran stock ---------- */

function fmtDateTime(d) {
  if (!d) return "—";
  const x = new Date(d);
  return `${x.toLocaleDateString("fr-FR")} · ${x.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
}
function fmtShortDate(d) {
  return d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) : "";
}

// Fiche de stock d'un produit : stock de départ daté, arrivages datés,
// ajustements, ventes et stock actuel, avec le calcul affiché.
function StockLedgerModal({ product, categories, sales, movements, inventories, onClose }) {
  const L = buildStockLedger(product, { sales, movements, inventories });
  const unit = product.unit || "unité";
  const Tile = ({ label, value, sub, bg, fg }) => (
    <div className="rounded-xl px-3 py-2 min-w-0" style={{ background: bg }}>
      <p className="text-[10px] font-semibold" style={{ color: fg, opacity: 0.85 }}>{label}</p>
      <p className="font-mono font-bold text-base leading-tight" style={{ color: fg }}>{value}</p>
      {sub && <p className="text-[10px] truncate" style={{ color: fg, opacity: 0.75 }}>{sub}</p>}
    </div>
  );
  const Row = ({ icon: Icon, color, title, sub, detail, value, valueColor, highlight }) => (
    <div className="flex gap-2.5 py-2.5 px-4 -mx-4" style={{ borderBottom: "1px solid var(--line)", background: highlight ? "var(--paper-dim)" : "transparent" }}>
      <Icon size={17} color={color} className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold">{title}</p>
        <p className="text-[11px] opacity-55">{sub}</p>
        {detail && <p className="text-[11px] mt-1 opacity-75">{detail}</p>}
      </div>
      <p className="font-mono font-bold text-sm shrink-0" style={{ color: valueColor || "var(--ink)" }}>{value}</p>
    </div>
  );
  // Historique chronologique : départ → arrivages / ajustements → ventes → actuel.
  const events = [...L.arrivals, ...L.adjustments, ...(L.returns || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center no-print">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl overflow-hidden gb-pop flex flex-col" style={{ maxHeight: "calc(100dvh - max(24px, env(safe-area-inset-top)) - 56px)" }}>
        <div className="px-4 py-3.5 flex items-center gap-3 shrink-0" style={{ background: "var(--glass)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.12)" }}><CategoryIcon cat={product.category} categories={categories} size={19} /></div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{product.name}</p>
            <p className="text-[11px] text-white/60">Fiche de stock</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/60">Stock actuel</p>
            <p className="font-mono font-bold text-xl text-white leading-none">{L.current}</p>
          </div>
          <button onClick={onClose} className="gb-focus ml-1" aria-label="Fermer"><X size={18} color="rgba(255,255,255,0.7)" /></button>
        </div>

        <div className="p-4 flex-1 min-h-0 overflow-y-auto gb-scroll">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <Tile label="Stock de départ" value={L.opening} sub={L.openingDate ? new Date(L.openingDate).toLocaleDateString("fr-FR") : "—"} bg="var(--paper-dim)" fg="var(--ink)" />
            <Tile label="Arrivages" value={`+${L.arrived}`} sub={`${L.arrivals.length} livraison${L.arrivals.length > 1 ? "s" : ""}`} bg="#EAF3DE" fg="#27500A" />
            <Tile label="Vendus" value={`−${L.sold}`} sub={L.openingDate ? `depuis le ${fmtShortDate(L.openingDate)}` : "au total"} bg="#FCEBEB" fg="#A32D2D" />
            <Tile label="Stock actuel" value={L.current} sub={`${L.opening} + ${L.arrived}${L.adjusted ? ` ${L.adjusted > 0 ? "+" : "−"} ${Math.abs(L.adjusted)}` : ""}${L.returnAdj ? ` ${L.returnAdj > 0 ? "+" : "−"} ${Math.abs(L.returnAdj)}` : ""} − ${L.sold}`} bg="#E6F1FB" fg="#0C447C" />
          </div>
          {L.adjusted !== 0 && <p className="text-[11px] opacity-60 mb-2">Ajustements manuels / comptages : {L.adjusted > 0 ? "+" : ""}{L.adjusted}</p>}
          {L.ecart !== 0 && (
            <p className="text-[11px] font-medium rounded-lg px-2.5 py-1.5 mb-2" style={{ background: "#FAEEDA", color: "#854F0B" }}>
              Écart de {L.ecart > 0 ? "+" : ""}{L.ecart} entre le stock réel ({L.current}) et le stock calculé ({L.expected}). Un comptage de stock permet de le régulariser.
            </p>
          )}

          <p className="text-[13px] font-bold mt-3 mb-1">Historique du stock</p>
          <div style={{ borderTop: "1px solid var(--line)" }}>
            <Row icon={ClipboardCheck} color="var(--ink)" title="Stock de départ" sub={fmtDateTime(L.openingDate)} value={L.opening} />
            {events.map((e, idx) => e.kind === "retour" ? (
              <Row key={idx} icon={Undo2} color="#0F6E56" title="Retour client"
                sub={`${fmtDateTime(e.date)}${e.author ? ` · ${e.author}` : ""}${e.note ? ` · ${e.note}` : ""}`}
                detail={e.restocked ? `${e.qty} remis en stock (vente diminuée d'autant)` : `${e.qty} non remis en stock — article retiré (${e.note || "défectueux"})`}
                value={e.restocked ? `+${e.qty}` : "0"} valueColor="#0F6E56" />
            ) : e.kind === "arrivage" ? (
              <Row key={idx} icon={Truck} color="#3B6D11" highlight title="Arrivage fournisseur"
                sub={`${fmtDateTime(e.date)}${e.note ? ` · ${e.note}` : ""}`}
                detail={e.before != null ? `Stock avant : ${e.before}  +  reçu : ${e.qty}  =  nouveau stock : ${e.after ?? e.before + e.qty}` : null}
                value={`+${e.qty}`} valueColor="#3B6D11" />
            ) : (
              <Row key={idx} icon={e.qty >= 0 ? ArrowUpCircle : ArrowDownCircle} color="#854F0B"
                title={e.kind === "comptage" ? "Comptage de stock" : "Ajustement manuel"}
                sub={`${fmtDateTime(e.date)}${e.author ? ` · ${e.author}` : ""}`}
                detail={e.before != null ? `${e.before} → ${e.after}` : null}
                value={`${e.qty > 0 ? "+" : ""}${e.qty}`} valueColor="#854F0B" />
            ))}
            <Row icon={ShoppingCart} color="#A32D2D" title="Ventes"
              sub={L.saleCount ? `${fmtShortDate(L.firstSale)} → ${fmtShortDate(L.lastSale)} · ${L.saleCount} vente${L.saleCount > 1 ? "s" : ""}` : "Aucune vente depuis le départ"}
              value={`−${L.sold}`} valueColor="#A32D2D" />
            <Row icon={Boxes} color="#185FA5" title="Stock actuel" sub={fmtDateTime(new Date())} value={`${L.current} ${unit}${L.current > 1 ? "s" : ""}`} valueColor="#185FA5" />
          </div>
          <div className="h-3" aria-hidden="true" />
        </div>

        {/* Barre de sécurité : toujours visible au-dessus de la barre de navigation du téléphone */}
        <div className="shrink-0 px-4 pt-3 flex items-center gap-3" style={{ background: "var(--card, #fff)", borderTop: "1px solid var(--line)", boxShadow: "0 -6px 16px rgba(22,32,42,0.06)", paddingBottom: "max(56px, calc(env(safe-area-inset-bottom) + 16px))" }}>
          <div className="flex-1 min-w-0 rounded-xl px-3 py-2" style={{ background: "#E6F1FB" }}>
            <p className="text-[10px] font-semibold" style={{ color: "#0C447C", opacity: 0.85 }}>Stock actuel</p>
            <p className="font-mono font-bold text-[15px] leading-tight" style={{ color: "#0C447C", whiteSpace: "nowrap" }}>{L.current} {unit}{L.current > 1 ? "s" : ""}</p>
          </div>
          <button type="button" onClick={onClose} className="gb-focus shrink-0 rounded-xl px-5 font-bold text-sm text-white" style={{ background: "var(--glass)", minHeight: 48 }}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Dates de péremption (lots) ----------
// Chaque produit peut avoir des lots datés (product.lots). Le stock actuel
// est réparti sur les lots les plus récents d'abord : les plus anciens sont
// donc les premiers considérés comme vendus (premier entré, premier sorti).
function dayStart(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); }
function lotsWithRemaining(product) {
  let left = Math.max(0, Number(product?.stock) || 0);
  return (product?.lots || [])
    .filter((l) => !l.cleared)
    .sort((a, b) => String(b.addedAt).localeCompare(String(a.addedAt)))
    .map((l) => { const rem = Math.min(Math.max(0, Number(l.qty) || 0), left); left -= rem; return { ...l, remaining: rem }; });
}
function expiringLots(products) {
  const today = dayStart(new Date());
  const out = [];
  (products || []).forEach((p) => {
    lotsWithRemaining(p).forEach((l) => {
      if (!l.expiry || l.remaining <= 0) return;
      out.push({ product: p, lot: l, remaining: l.remaining, days: Math.round((dayStart(`${l.expiry}T12:00:00`) - today) / 864e5) });
    });
  });
  return out.sort((a, b) => a.days - b.days);
}

function AddLotModal({ products, onSave, onClose }) {
  const [query, setQuery] = useState("");
  const [productId, setProductId] = useState(null);
  const [qty, setQty] = useState("");
  const [expiry, setExpiry] = useState("");
  const [inStock, setInStock] = useState(true);
  const product = products.find((p) => p.id === productId);
  const q = query.trim().toLowerCase();
  const matches = products.filter((p) => !q || (p.name || "").toLowerCase().includes(q) || (p.barcode || "").toLowerCase().includes(q)).slice(0, 8);
  const ok = product && Number(qty) > 0 && expiry;
  return (
    <div className="fixed inset-0 z-[93] flex items-end sm:items-center justify-center no-print" style={{ background: "rgba(22,32,42,0.55)", padding: "max(24px, env(safe-area-inset-top)) 0 0" }} onClick={onClose}>
      <div className="w-full max-w-[440px] rounded-t-[26px] sm:rounded-[26px] flex flex-col gb-slide-up" style={{ background: "var(--paper)", maxHeight: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pt-4 pb-3 flex items-center gap-3 shrink-0" style={{ borderBottom: "1px solid var(--line)" }}>
          <div className="flex-1 min-w-0"><p className="font-display font-bold text-[18px]">Ajouter un lot daté</p><p className="text-[12.5px] opacity-60">Produit, quantité et date de péremption</p></div>
          <button onClick={onClose} className="gb-focus w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }} aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto gb-scroll px-5 pt-4 pb-4 flex flex-col gap-3">
          {product ? (
            <div className="rounded-2xl p-3 flex items-center gap-3" style={{ background: "var(--card)", border: "1.5px solid #0F6E56" }}>
              <div className="flex-1 min-w-0"><p className="text-[14.5px] font-bold break-words">{product.name}</p><p className="text-[12px] opacity-60">{product.stock} en stock</p></div>
              <button onClick={() => setProductId(null)} className="gb-focus text-[12.5px] font-bold px-3 py-2 rounded-xl" style={{ background: "var(--paper-dim)" }}>Changer</button>
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold opacity-60 block mb-1.5">Produit</label>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un produit" className="gb-focus w-full rounded-xl px-3 py-2.5 text-[14px] mb-2" style={{ border: "1px solid var(--line)", background: "var(--card)" }} />
              <div className="flex flex-col gap-1.5">
                {matches.map((p) => (
                  <button key={p.id} onClick={() => setProductId(p.id)} className="gb-focus w-full text-left rounded-xl px-3 py-2.5 flex justify-between gap-2" style={{ background: "var(--card)", border: "1px solid var(--line)" }}><span className="text-[14px] font-semibold min-w-0 break-words">{p.name}</span><span className="text-[12px] opacity-55 shrink-0">{p.stock} en stock</span></button>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs font-semibold opacity-60 block mb-1.5">Quantité du lot</label><input value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Ex : 24" className="gb-focus w-full rounded-xl px-3 py-2.5 text-[14px]" style={{ border: "1px solid var(--line)", background: "var(--card)" }} /></div>
            <div><label className="text-xs font-semibold opacity-60 block mb-1.5">Expire le</label><input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="gb-focus w-full rounded-xl px-3 py-2.5 text-[14px]" style={{ border: "1px solid var(--line)", background: "var(--card)" }} /></div>
          </div>
          <button type="button" onClick={() => setInStock(!inStock)} className="gb-focus w-full rounded-2xl p-3.5 flex items-center gap-3 text-left" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>
            <div className="flex-1 min-w-0"><p className="text-[14px] font-semibold">Déjà compté dans le stock</p><p className="text-[12px] opacity-60">{inStock ? "Seule la date est ajoutée, le stock ne change pas." : `Le stock augmentera de ${Number(qty) || 0} (nouvel arrivage).`}</p></div>
            <span className="w-12 h-7 rounded-full relative shrink-0" style={{ background: inStock ? "#1E8E50" : "#C9C6BC" }}><span className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow" style={{ left: inStock ? 22 : 2 }} /></span>
          </button>
        </div>
        <div className="px-5 pt-3 shrink-0" style={{ borderTop: "1px solid var(--line)", paddingBottom: "max(18px, calc(env(safe-area-inset-bottom) + 12px))" }}>
          <button disabled={!ok} onClick={() => onSave({ productId, qty: Number(qty), expiry, addToStock: !inStock })} className="gb-focus w-full min-h-[52px] rounded-2xl text-white font-bold text-[15px] flex items-center justify-center gap-2 disabled:opacity-40" style={{ background: "#0F6E56" }}><CalendarCheck size={18} /> Enregistrer le lot</button>
        </div>
      </div>
    </div>
  );
}

function ExpiryView({ products, categories, isAdmin, onLotAction, onAddLot }) {
  const [filter, setFilter] = useState("watch");
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const all = expiringLots(products);
  const expired = all.filter((x) => x.days < 0);
  const in7 = all.filter((x) => x.days >= 0 && x.days <= 7);
  const in30 = all.filter((x) => x.days > 7 && x.days <= 30);
  const list = filter === "watch" ? all.filter((x) => x.days <= 30) : all;
  const badge = (d) => (d < 0 ? { t: `Périmé depuis ${-d} j`, bg: "#2C2C2A", fg: "#fff" } : d === 0 ? { t: "Expire aujourd'hui", bg: "#FBE4E1", fg: "#8A2419" } : d <= 7 ? { t: `Dans ${d} jour${d > 1 ? "s" : ""}`, bg: "#FBE4E1", fg: "#8A2419" } : d <= 30 ? { t: `Dans ${d} jours`, bg: "#FFF1D6", fg: "#6E3C00" } : { t: `Dans ${d} jours`, bg: "#EAF6EF", fg: "#0F4F2B" });
  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[["Périmés", expired.length, "#2C2C2A", "#fff"], ["Sous 7 jours", in7.length, "#FBE4E1", "#8A2419"], ["Sous 30 jours", in30.length, "#FFF1D6", "#6E3C00"]].map(([l, n, bg, fg]) => (
          <div key={l} className="rounded-2xl px-3 py-2.5 min-w-0" style={{ background: bg, color: fg }}><p className="text-[12px]" style={{ opacity: 0.85 }}>{l}</p><p className="font-display font-bold text-[22px] leading-tight">{n}</p></div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {[["watch", "À surveiller"], ["all", "Tous les lots datés"]].map(([id, l]) => (
          <button key={id} onClick={() => setFilter(id)} className="gb-focus px-3.5 py-2 rounded-full text-[13px] font-semibold" style={{ background: filter === id ? "#1F2A33" : "var(--card)", color: filter === id ? "#fff" : "var(--ink)", border: filter === id ? "1px solid #1F2A33" : "1px solid var(--line)" }}>{l}</button>
        ))}
      </div>
      {list.length === 0 && (
        <div className="rounded-[18px] p-6 text-center flex flex-col gap-1.5 mb-3" style={{ background: "var(--card)", border: "1px dashed var(--line)" }}>
          <span className="text-[15px] font-bold">{all.length ? "Aucun lot à surveiller" : "Aucun lot daté pour l'instant"}</span>
          <span className="text-[13px] opacity-60">{all.length ? "Aucune péremption dans les 30 prochains jours." : "Ajoutez la date de péremption de vos produits frais (yaourts, jus, lait…) pour être prévenu à temps."}</span>
        </div>
      )}
      <div className="flex flex-col gap-2.5">
        {list.map(({ product, lot, remaining, days }) => {
          const b = badge(days);
          const unit = product.unit || "unité";
          const isConfirm = confirm && confirm.lotId === lot.id;
          return (
            <div key={lot.id} className="rounded-[18px] p-3.5 flex flex-col gap-2.5" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><CategoryIcon cat={product.category} categories={categories} size={17} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold break-words">{product.name}</p>
                  <p className="text-[12.5px] opacity-60">Lot du {new Date(lot.addedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} · {remaining} {unit}{remaining > 1 ? "s" : ""} restant{remaining > 1 ? "s" : ""}</p>
                  <p className="text-[12.5px] opacity-60">Expire le {new Date(`${lot.expiry}T12:00:00`).toLocaleDateString("fr-FR")}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[12px] font-bold whitespace-nowrap shrink-0" style={{ background: b.bg, color: b.fg }}>{b.t}</span>
              </div>
              {isAdmin && !isConfirm && (
                <div className="grid grid-cols-2 gap-2">
                  {days < 0
                    ? <button onClick={() => setConfirm({ lotId: lot.id, productId: product.id, action: "loss", remaining })} className="gb-focus min-h-[42px] rounded-xl text-[13px] font-bold" style={{ background: "#FBE4E1", color: "#8A2419" }}>Déclarer la perte</button>
                    : <button onClick={() => onLotAction(product.id, lot.id, "feature")} className="gb-focus min-h-[42px] rounded-xl text-[13px] font-bold" style={{ background: product.favorite ? "#EAF6EF" : "#E1F5EE", color: "#0F6E56" }}>{product.favorite ? "Déjà en touche rapide" : "Mettre en avant"}</button>}
                  <button onClick={() => setConfirm({ lotId: lot.id, productId: product.id, action: "remove", remaining })} className="gb-focus min-h-[42px] rounded-xl text-[13px] font-bold" style={{ background: "var(--paper-dim)" }}>Retirer du stock</button>
                </div>
              )}
              {isConfirm && (
                <div className="rounded-xl p-3" style={{ background: "#FCEBE8" }}>
                  <p className="text-[12.5px] mb-2.5" style={{ color: "#8A2419" }}>{confirm.action === "loss" ? "Déclarer" : "Retirer"} {remaining} {unit}{remaining > 1 ? "s" : ""} de {product.name} ? Le stock passera de {product.stock} à {Math.max(0, product.stock - remaining)}.</p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirm(null)} className="gb-focus flex-1 rounded-xl py-2.5 text-[13px] font-semibold" style={{ background: "#fff" }}>Annuler</button>
                    <button onClick={() => { onLotAction(product.id, lot.id, confirm.action, remaining); setConfirm(null); }} className="gb-focus flex-1 rounded-xl py-2.5 text-[13px] font-semibold text-white" style={{ background: "var(--danger)" }}>Confirmer</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {isAdmin && <button onClick={() => setAdding(true)} className="gb-focus w-full mt-4 min-h-[52px] rounded-2xl text-white text-[14.5px] font-bold flex items-center justify-center gap-2" style={{ background: "#1F2A33" }}><CalendarCheck size={17} /> Ajouter un lot avec sa date</button>}
      {!isAdmin && <p className="text-[12px] opacity-55 mt-3">Seul l'administrateur peut ajouter ou retirer des lots.</p>}
      {adding && <AddLotModal products={products} onClose={() => setAdding(false)} onSave={(lot) => { onAddLot(lot); setAdding(false); }} />}
    </div>
  );
}

// ---------- Prévisions de rupture (jours de stock restants) ----------
function computeStockForecast(products, sales, windowDays = 14) {
  const now = Date.now();
  const since = now - windowDays * 864e5;
  const soldBy = {};
  let first = now;
  (sales || []).forEach((s) => {
    const t = new Date(s.date).getTime();
    if (!(t >= since)) return;
    first = Math.min(first, t);
    (s.items || []).forEach((it) => {
      const id = it.product?.id || it.id;
      soldBy[id] = (soldBy[id] || 0) + (Number(it.qty) || 0);
    });
  });
  const span = Math.max(1, Math.min(windowDays, (now - first) / 864e5));
  return (products || []).map((p) => {
    const sold = soldBy[p.id] || 0;
    const rate = sold / span;
    const stock = Math.max(0, Number(p.stock) || 0);
    return { p, sold, rate, stock, daysLeft: rate > 0 ? stock / rate : Infinity };
  });
}

function StockForecast({ products, sales, suppliers = [], supplierProducts = [], isAdmin, onCreateOrders }) {
  const [filter, setFilter] = useState("7");
  const [cover, setCover] = useState(10);
  const rows = computeStockForecast(products, sales);
  const withSp = rows.map((r) => {
    const sp = supplierProducts.find((x) => x.productId === r.p.id) || null;
    const need = Math.max(0, Math.ceil(r.rate * cover - r.stock));
    const crates = sp && sp.crateSize ? Math.ceil(need / sp.crateSize) : 0;
    return { ...r, sp, supplier: sp ? suppliers.find((s) => s.id === sp.supplierId) : null, need, crates };
  });
  const soon3 = withSp.filter((r) => r.rate > 0 && r.daysLeft <= 3);
  const soon7 = withSp.filter((r) => r.rate > 0 && r.daysLeft <= 7);
  const list = (filter === "3" ? soon3 : filter === "7" ? soon7 : withSp.filter((r) => r.rate > 0)).sort((a, b) => a.daysLeft - b.daysLeft);
  const idle = withSp.filter((r) => r.rate === 0 && r.stock > 0).length;
  const orderable = soon7.filter((r) => r.sp && r.crates > 0);
  const createOrders = () => {
    const bySupplier = {};
    orderable.forEach((r) => {
      const k = r.sp.supplierId;
      if (!bySupplier[k]) bySupplier[k] = [];
      bySupplier[k].push({ productId: r.sp.productId, productName: r.sp.productName, barcode: r.sp.barcode || "", category: r.sp.category || "", crateSize: r.sp.crateSize, cratePrice: r.sp.cratePrice, salePrice: r.sp.salePrice || 0, crates: r.crates });
    });
    onCreateOrders?.(Object.entries(bySupplier).map(([supplierId, items]) => ({ id: uid(), supplierId, date: new Date().toISOString(), status: "pending", items, note: "Créée depuis les prévisions de rupture" })));
  };
  const tone = (d) => (d <= 3 ? { c: "#B3261E", bg: "#FBE4E1" } : d <= 7 ? { c: "#C27A0E", bg: "#FFF1D6" } : { c: "#1E8E50", bg: "#E4F4EA" });
  const chip = (id, label) => (
    <button key={id} onClick={() => setFilter(id)} className="gb-focus px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap" style={{ background: filter === id ? "#1F2A33" : "var(--card)", color: filter === id ? "#fff" : "var(--ink)", border: filter === id ? "1px solid #1F2A33" : "1px solid var(--line)" }}>{label}</button>
  );
  return (
    <div>
      {soon7.length > 0 ? (
        <div className="rounded-2xl px-3.5 py-3 mb-3 flex items-start gap-2.5" style={{ background: "#FFF1D6", color: "#6E3C00" }}>
          <Clock size={17} className="shrink-0 mt-0.5" />
          <p className="text-[13px] font-semibold leading-snug">{soon7.length} produit{soon7.length > 1 ? "s" : ""} risque{soon7.length > 1 ? "nt" : ""} la rupture dans les 7 prochains jours au rythme actuel des ventes.</p>
        </div>
      ) : (
        <div className="rounded-2xl px-3.5 py-3 mb-3 flex items-start gap-2.5" style={{ background: "#EAF6EF", color: "#0F4F2B" }}>
          <Check size={17} className="shrink-0 mt-0.5" />
          <p className="text-[13px] font-semibold leading-snug">Aucune rupture prévue dans les 7 prochains jours.</p>
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-2">
        {chip("3", `Sous 3 jours · ${soon3.length}`)}
        {chip("7", `Sous 7 jours · ${soon7.length}`)}
        {chip("all", "Tous les produits vendus")}
      </div>
      <div className="flex items-center gap-2 flex-wrap mb-3 text-[12.5px]">
        <span className="opacity-60">Conseil calculé pour tenir</span>
        {[7, 10, 14].map((d) => (
          <button key={d} onClick={() => setCover(d)} className="gb-focus px-2.5 py-1 rounded-lg font-bold" style={{ background: cover === d ? "#E1F5EE" : "var(--paper-dim)", color: cover === d ? "#0F6E56" : "var(--ink)" }}>{d} jours</button>
        ))}
      </div>
      {list.length === 0 && <p className="text-[13.5px] opacity-55 text-center py-8">Rien à signaler dans cette liste.</p>}
      <div className="flex flex-col gap-2.5">
        {list.map((r) => {
          const t = tone(r.daysLeft);
          const days = r.daysLeft < 1 ? "< 1" : Math.floor(r.daysLeft);
          const pct = Math.max(4, Math.min(100, (r.daysLeft / 14) * 100));
          const unit = r.p.unit || "unité";
          return (
            <div key={r.p.id} className="rounded-[18px] p-3.5 flex flex-col gap-2.5" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold break-words">{r.p.name}</p>
                  <p className="text-[12.5px] opacity-60">{r.stock} en stock · environ {r.rate >= 10 ? Math.round(r.rate) : r.rate.toFixed(1).replace(".", ",")} vendu{r.rate >= 2 ? "s" : ""} / jour</p>
                </div>
                <div className="shrink-0 text-center px-2.5 py-1.5 rounded-xl" style={{ background: t.bg, color: t.c }}>
                  <p className="font-display font-bold text-[19px] leading-none">{days}</p>
                  <p className="text-[11px] font-bold">jour{days === 1 || days === "< 1" ? "" : "s"}</p>
                </div>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--paper-dim)" }}><div className="h-full rounded-full" style={{ width: `${pct}%`, background: t.c }} /></div>
              {r.need > 0 ? (
                <p className="text-[13px] flex items-center gap-2"><Truck size={15} className="opacity-60 shrink-0" /><span className="min-w-0">Conseil : commander <b>{r.sp && r.crates ? `${r.crates} casier${r.crates > 1 ? "s" : ""} de ${r.sp.crateSize}` : `${r.need} ${unit}${r.need > 1 ? "s" : ""}`}</b>{r.supplier ? ` chez ${r.supplier.name}` : r.sp ? "" : " (aucun fournisseur lié)"}</span></p>
              ) : (
                <p className="text-[12.5px] opacity-60">Stock suffisant pour {cover} jours.</p>
              )}
            </div>
          );
        })}
      </div>
      {idle > 0 && filter === "all" && <p className="text-[12px] opacity-55 mt-3">{idle} produit{idle > 1 ? "s" : ""} en stock sans vente depuis 14 jours.</p>}
      {isAdmin && orderable.length > 0 && (
        <button onClick={createOrders} className="gb-focus w-full mt-4 min-h-[52px] rounded-2xl text-white text-[14.5px] font-bold flex items-center justify-center gap-2" style={{ background: "#1F2A33" }}><Truck size={17} /> Préparer {orderable.length > 1 ? `les commandes (${orderable.length} produits)` : "la commande"}</button>
      )}
      <p className="text-[11.5px] opacity-50 mt-2">Calcul basé sur les ventes des 14 derniers jours. Les commandes préparées restent « en attente » dans Fournisseurs : vous pouvez les modifier avant l'envoi.</p>
    </div>
  );
}

function StockScreen({ products, categories, sales = [], movements = [], inventories = [], suppliers = [], supplierProducts = [], isAdmin, onCreateOrders, onLotAction, onAddLot, shop }) {
  const [mode, setMode] = useState("etat");
  const expiryAlerts = expiringLots(products).filter((l) => l.days <= 7).length;
  const fmt = useFmt();
  const [ledgerProductId, setLedgerProductId] = useState(null);
  const ledgerProduct = ledgerProductId ? products.find((p) => p.id === ledgerProductId) : null;
  const [cat, setCat] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const statusOf = (p) => (Number(p.stock) <= 0 ? "out" : Number(p.stock) <= Number(p.minStock) ? "low" : "ok");
  const TONE = {
    out: { c: "#C2331F", bg: "#FBE4E1", t: "#8A2419", border: "#EBB3AA", label: "Rupture" },
    low: { c: "#E09A1A", bg: "#FFF1D6", t: "#6E3C00", border: "#F0D39A", label: "Stock bas" },
    ok: { c: "#1E8E50", bg: "#E4F4EA", t: "#0F4F2B", border: "var(--line)", label: "En stock" },
  };
  const counts = { out: 0, low: 0, ok: 0 };
  products.forEach((p) => { counts[statusOf(p)] += 1; });
  const value = products.reduce((sum, p) => sum + Math.max(0, Number(p.stock) || 0) * (Number(p.costPrice) || 0), 0);
  const q = query.trim().toLowerCase();
  const list = products
    .filter((p) => (cat === "all" || p.category === cat) && (status === "all" || statusOf(p) === status) && (!q || (p.name || "").toLowerCase().includes(q) || (p.barcode || "").toLowerCase().includes(q)))
    .sort((a, b) => a.stock / Math.max(a.minStock, 1) - b.stock / Math.max(b.minStock, 1));
  const groups = [
    { id: "alert", title: "À réapprovisionner", items: list.filter((p) => statusOf(p) !== "ok"), tone: TONE.out },
    { id: "ok", title: "En stock", items: list.filter((p) => statusOf(p) === "ok"), tone: TONE.ok },
  ].filter((g) => g.items.length);
  return (
    <div className="px-4 pt-4 pb-36">
      <div role="tablist" className="grid grid-cols-3 gap-1 p-1 rounded-2xl mb-4" style={{ background: "var(--paper-dim)" }}>
        {[["etat", "État du stock"], ["forecast", "Prévisions"], ["expiry", "Péremption"]].map(([id, label]) => (
          <button key={id} role="tab" aria-selected={mode === id} onClick={() => setMode(id)} className="gb-focus min-h-[42px] rounded-xl text-[13px] font-bold relative" style={{ background: mode === id ? "var(--card)" : "transparent", boxShadow: mode === id ? "0 1px 3px rgba(22,32,42,0.12)" : "none" }}>
            {label}
            {id === "expiry" && expiryAlerts > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ background: "#B3261E" }}>{expiryAlerts}</span>}
          </button>
        ))}
      </div>
      {mode === "forecast" ? (
        <StockForecast products={products} sales={sales} suppliers={suppliers} supplierProducts={supplierProducts} isAdmin={isAdmin} onCreateOrders={onCreateOrders} />
      ) : mode === "expiry" ? (
        <ExpiryView products={products} categories={categories} isAdmin={isAdmin} onLotAction={onLotAction} onAddLot={onAddLot} />
      ) : (<>
      <div className="flex items-end justify-between gap-3 mb-3.5">
        <div className="min-w-0">
          <h2 className="font-display font-bold text-[24px] leading-tight">État du stock</h2>
          <p className="text-[13px] opacity-60 mt-0.5">{products.length} produit{products.length > 1 ? "s" : ""}{value > 0 ? ` · valeur ${fmt(value)}` : ""}</p>
        </div>
      </div>

      <section aria-label="Santé du stock" className="grid grid-cols-3 gap-2 mb-3.5">
        {["out", "low", "ok"].map((k) => {
          const t = TONE[k]; const on = status === k;
          return (
            <button key={k} onClick={() => setStatus(on ? "all" : k)} aria-pressed={on} className="gb-focus min-w-0 min-h-[92px] p-3 rounded-2xl text-left flex flex-col justify-between gap-1.5" style={on ? { background: t.c, color: "#fff", border: `1px solid ${t.c}` } : { background: "var(--card)", color: k === "ok" ? "var(--ink)" : t.t, border: `1px solid ${k === "ok" ? "var(--line)" : t.border}` }}>
              <span className="flex justify-between items-center w-full"><span className="w-2.5 h-2.5 rounded-full" style={{ background: on ? "#fff" : t.c }} />{on && <Check size={14} />}</span>
              <span className="font-display font-bold text-[24px] leading-none">{counts[k]}</span>
              <span className="text-[12.5px] font-bold leading-tight">{t.label}</span>
            </button>
          );
        })}
      </section>

      <div className="sticky z-10 -mx-4 px-4 pt-2 pb-3 mb-1 flex flex-col gap-2.5" style={{ top: "calc(max(22px, env(safe-area-inset-top)) + 48px)", background: "var(--paper)", borderBottom: "1px solid var(--line)" }}>
        <label className="flex items-center gap-2.5 min-h-[46px] px-3.5 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--line)" }}>
          <Search size={17} className="opacity-50" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom ou code-barres" aria-label="Rechercher un produit" className="flex-1 min-w-0 bg-transparent outline-none text-[15px]" />
          {query && <button onClick={() => setQuery("")} className="gb-focus p-1" aria-label="Effacer"><X size={16} /></button>}
        </label>
        <div role="group" aria-label="Catégories" className="flex flex-wrap gap-1.5">
          {["all", ...categories.map((c) => c.id)].map((c) => {
            const on = cat === c;
            return (
              <button key={c} onClick={() => setCat(c)} aria-pressed={on} className="gb-focus min-h-[38px] px-3.5 rounded-full text-[13.5px] font-semibold flex items-center gap-1.5" style={on ? { background: "#1F2A33", color: "#fff", border: "1px solid #1F2A33" } : { background: "var(--card)", color: "var(--ink)", border: "1px solid var(--line)" }}>
                {c !== "all" && <CategoryIcon cat={c} categories={categories} size={14} />}{c === "all" ? "Tout" : getCategory(categories, c).label}
              </button>
            );
          })}
        </div>
      </div>

      {list.length === 0 && (
        <div className="mt-4 rounded-[18px] p-7 text-center flex flex-col gap-1.5" style={{ background: "var(--card)", border: "1px dashed var(--line)" }}>
          <span className="text-[15px] font-bold">Aucun produit trouvé</span>
          <span className="text-[13px] opacity-60">Changez de catégorie ou effacez la recherche.</span>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.id} className="flex flex-col gap-2.5 pt-4">
          <div className="flex items-center gap-2 px-0.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: g.tone.c }} />
            <h3 className="text-[13px] font-bold uppercase tracking-wide opacity-80">{g.title}</h3>
            <span className="min-w-[22px] h-[22px] px-1.5 rounded-full text-[12px] font-bold flex items-center justify-center" style={{ background: g.tone.bg, color: g.tone.t }}>{g.items.length}</span>
            <span className="flex-1 h-px" style={{ background: "var(--line)" }} />
          </div>
          {g.items.map((p) => {
            const st = statusOf(p); const t = TONE[st];
            const target = Math.max(Number(p.minStock) * 2, 1);
            const pct = Math.min(Math.round((Math.max(0, p.stock) / target) * 100), 100);
            const missing = Math.max(0, target - p.stock);
            const catMeta = getCategory(categories, p.category);
            return (
              <button type="button" key={p.id} onClick={() => setLedgerProductId(p.id)} aria-label={`Fiche de stock de ${p.name}`} className="gb-focus w-full text-left rounded-[18px] p-3.5 flex flex-col gap-3" style={{ background: "var(--card)", border: `1px solid ${t.border}`, boxShadow: "0 1px 2px rgba(22,32,42,0.05)" }}>
                <span className="flex items-center gap-3 w-full">
                  <span className="w-[46px] h-[46px] rounded-[14px] overflow-hidden shrink-0 flex items-center justify-center" style={{ background: `${catMeta.color || "#888888"}1F` }}>
                    {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : <CategoryIcon cat={p.category} categories={categories} size={22} />}
                  </span>
                  <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="text-[16px] font-bold leading-tight break-words">{p.name}</span>
                    <span className="text-[12.5px] opacity-60 break-all">{catMeta.label}{p.barcode ? ` · ${p.barcode}` : " · sans code-barres"}</span>
                  </span>
                  <span className="shrink-0 min-w-[64px] px-2.5 py-1.5 rounded-xl flex flex-col items-center" style={st === "ok" ? { background: "var(--paper-dim)" } : { background: t.bg, color: t.t }}>
                    <span className="font-display font-bold text-[22px] leading-none">{p.stock}</span>
                    <span className="text-[11px] font-semibold mt-0.5">{p.unit || "unité"}{p.stock > 1 ? "s" : ""}</span>
                  </span>
                </span>
                <span className="flex flex-col gap-1.5 w-full">
                  <span className="relative block h-2 rounded-full overflow-hidden" style={{ background: "var(--paper-dim)" }}>
                    <span className="absolute left-0 top-0 bottom-0 rounded-full" style={{ width: `${pct}%`, background: t.c }} />
                    <span className="absolute top-0 bottom-0 w-0.5" style={{ left: "50%", background: "var(--ink)", opacity: 0.3 }} />
                  </span>
                  <span className="flex justify-between items-center gap-2 flex-wrap text-[12.5px]">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[12px] font-bold" style={{ background: t.bg, color: t.t }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: t.c }} />{t.label}</span>
                    <span className="opacity-65">Seuil <b>{p.minStock}</b> · {st === "ok" ? "suffisant" : `manque ${missing}`}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </section>
      ))}
      {products.length > 0 && <p className="text-[12px] opacity-50 text-center mt-5">Touchez un produit pour voir sa fiche de stock.</p>}
      {ledgerProduct && <StockLedgerModal product={ledgerProduct} categories={categories} sales={sales} movements={movements} inventories={inventories} onClose={() => setLedgerProductId(null)} />}
      </>)}
    </div>
  );
}

/* ---------- Écran historique ---------- */

function SalesPdfPreview({ shop, sales, vendorFilter, onClose, pushToast }) {
  const fmt = useFmt();
  const [exporting, setExporting] = useState(false);
  const total = sales.reduce((s, x) => s + x.total, 0);

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const marginX = 40;
      let y = 50;
      doc.setFont("helvetica", "bold"); doc.setFontSize(16);
      doc.text(shop.name, 297.5, y, { align: "center" }); y += 20;
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(90);
      doc.text(vendorFilter ? `Ventes de ${vendorFilter}` : "Historique des ventes", 297.5, y, { align: "center" }); y += 14;
      doc.setFontSize(8);
      doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`, 297.5, y, { align: "center" }); y += 24;
      doc.setDrawColor(200); doc.line(marginX, y, 555, y); y += 16;
      doc.setTextColor(20);
      sales.forEach((s) => {
        if (y > 780) { doc.addPage(); y = 50; }
        const dateStr = `${new Date(s.date).toLocaleDateString("fr-FR")} ${new Date(s.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
        const detail = `${vendorFilter ? "" : s.vendor + " — "}${s.items.map((i) => `${i.qty}x ${i.product.name}`).join(", ")} (${PAYMENT_LABELS[s.paymentMethod]}${s.paymentMethod === "credit" && !s.paid ? ", impayé" : ""})`;
        doc.setFontSize(9); doc.setFont("helvetica", "bold");
        doc.text(dateStr, marginX, y);
        doc.text(fmt(s.total), 555, y, { align: "right" });
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(detail, 400);
        doc.text(lines, marginX + 90, y);
        y += Math.max(14, lines.length * 11) + 8;
        doc.setDrawColor(230); doc.line(marginX, y - 4, 555, y - 4);
      });
      y += 10;
      doc.setDrawColor(20); doc.setLineWidth(1.2); doc.line(marginX, y, 555, y); y += 16;
      doc.setFont("helvetica", "bold"); doc.setFontSize(11);
      doc.text(`TOTAL (${sales.length} vente${sales.length > 1 ? "s" : ""})`, marginX, y);
      doc.text(fmt(total), 555, y, { align: "right" });
      await exportPdfDoc(`ventes_${new Date().toISOString().slice(0, 10)}.pdf`, doc);
    } catch {
      pushToast?.("Impossible de générer le PDF", "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-6">
      <div className="absolute inset-0 bg-black/50 no-print" onClick={onClose} />
      <div id="sales-print-area" className="relative w-full max-w-[500px] bg-white rounded-2xl p-6 gb-pop">
        <div className="flex items-center justify-between mb-5 no-print">
          <h2 className="font-display font-bold text-lg">Aperçu avant impression</h2>
          <button onClick={onClose} className="gb-focus p-1"><X size={20} /></button>
        </div>

        <div className="text-center mb-6">
          <p className="font-display font-bold text-xl">{shop.name}</p>
          <p className="text-xs opacity-60 mt-0.5">{vendorFilter ? `Ventes de ${vendorFilter}` : "Historique des ventes"}</p>
          <p className="text-[11px] opacity-40 mt-1">Généré le {new Date().toLocaleDateString("fr-FR")} à {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>

        <div className="flex text-[11px] font-semibold uppercase tracking-wide opacity-50 border-b pb-2 mb-1" style={{ borderColor: "var(--ink)" }}>
          <span className="w-[76px] shrink-0">Date</span>
          <span className="flex-1 px-2">Détail</span>
          <span className="w-16 shrink-0 text-right">Total</span>
        </div>
        {sales.length === 0 && <p className="text-sm opacity-50 text-center py-6">Aucune vente sur cette sélection.</p>}
        {sales.map((s) => (
          <div key={s.id} className="flex text-[11px] py-2 border-b" style={{ borderColor: "var(--line)" }}>
            <span className="w-[76px] shrink-0 opacity-70">{new Date(s.date).toLocaleDateString("fr-FR")}<br />{new Date(s.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
            <span className="flex-1 px-2">
              {!vendorFilter && <span className="font-semibold">{s.vendor} — </span>}
              {s.items.map((i) => `${i.qty}× ${i.product.name}`).join(", ")}
              <span className="opacity-50"> ({PAYMENT_LABELS[s.paymentMethod]}{s.paymentMethod === "credit" && !s.paid ? ", impayé" : ""})</span>
            </span>
            <span className="w-16 shrink-0 text-right font-mono font-semibold">{fmt(s.total)}</span>
          </div>
        ))}
        <div className="flex justify-between items-baseline font-bold text-sm mt-3 pt-3 border-t-2" style={{ borderColor: "var(--ink)" }}>
          <span>TOTAL ({sales.length} vente{sales.length > 1 ? "s" : ""})</span>
          <span className="font-mono text-base">{fmt(total)}</span>
        </div>

        <div className="flex gap-2 mt-6 no-print">
          <button onClick={onClose} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--paper-dim)" }}>Fermer</button>
          <button onClick={handleExportPdf} disabled={exporting} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-1.5 disabled:opacity-60" style={{ background: "var(--glass)" }}>
            <Printer size={14} /> {exporting ? "Génération…" : "Imprimer / Enregistrer PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryScreen({ shop, sales, products, clients, vendorFilter, isAdmin, onDeleteSale, onUpdateSale, onReturnSale, onSaveInvoice, pushToast }) {
  const fmt = useFmt();
  const [open, setOpen] = useState(null);
  const [returningSale, setReturningSale] = useState(null);
  const [finderOpen, setFinderOpen] = useState(false);
  const [viewReturn, setViewReturn] = useState(null);
  const [invoiceSale, setInvoiceSale] = useState(null);
  const [pdfPreview, setPdfPreview] = useState(false);
  const [reprintSale, setReprintSale] = useState(null);
  const [periodFilter, setPeriodFilter] = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [editingSale, setEditingSale] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  // "Mes ventes" (vendeur) inclut aussi les ventes faites par
  // l'administrateur — la caisse est partagée, un vendeur doit voir
  // l'ensemble de l'activité du jour, pas seulement ce qu'il a lui-même
  // encaissé. On reconnaît l'administrateur par son nom personnalisé actuel
  // ET par "Administrateur" (ventes plus anciennes, faites avant qu'un nom
  // personnalisé ne soit choisi).
  const adminName = shop?.adminDisplayName?.trim() || "Administrateur";
  const scoped = vendorFilter ? sales.filter((s) => s.vendor === vendorFilter || s.vendor === "Administrateur" || s.vendor === adminName) : sales;
  const sortedAll = [...scoped].sort((a, b) => new Date(b.date) - new Date(a.date));
  const sorted = sortedAll.filter((s) => {
    const d = new Date(s.date);
    if (periodFilter === "today") return d.toDateString() === new Date().toDateString();
    if (periodFilter === "7j") { const from = new Date(); from.setDate(from.getDate() - 7); return d >= from; }
    if (periodFilter === "30j") { const from = new Date(); from.setDate(from.getDate() - 30); return d >= from; }
    if (periodFilter === "custom") {
      if (customFrom && d < new Date(customFrom + "T00:00:00")) return false;
      if (customTo && d > new Date(customTo + "T23:59:59")) return false;
      return true;
    }
    return true;
  });
  const today = new Date().toDateString();
  // Vérifie qu'une date donnée tombe dans la période actuellement affichée —
  // même logique que le filtre sur `sorted` ci-dessus, mais réutilisable
  // pour tester la date d'UN PAIEMENT plutôt que la date de la vente.
  const inRevenuePeriod = (dateStr) => {
    const d = new Date(dateStr);
    if (periodFilter === "today") return d.toDateString() === new Date().toDateString();
    if (periodFilter === "7j") { const from = new Date(); from.setDate(from.getDate() - 7); return d >= from; }
    if (periodFilter === "30j") { const from = new Date(); from.setDate(from.getDate() - 30); return d >= from; }
    if (periodFilter === "custom") {
      if (customFrom && d < new Date(customFrom + "T00:00:00")) return false;
      if (customTo && d > new Date(customTo + "T23:59:59")) return false;
      return true;
    }
    return true;
  };
  // Avant, ces cases restaient bloquées sur "aujourd'hui" quel que soit le
  // filtre choisi (7 jours, 30 jours, plage...). Elles suivent maintenant la
  // MÊME période que la liste affichée (`sorted`), avec un intitulé qui
  // s'adapte pour rester honnête sur ce qu'elles montrent.
  const cashInPeriod = sorted.filter((s) => s.paymentMethod !== "credit").reduce((s, x) => s + x.total, 0);
  const creditGivenUnpaidInPeriod = sorted.filter((s) => s.paymentMethod === "credit" && !s.paid).reduce((s, x) => s + (x.total - creditPaidSoFar(x)), 0);
  // Chaque règlement d'un crédit — même partiel, même celui encaissé le
  // jour même de la vente quand le client n'a pas pu tout payer d'un coup —
  // compte dans la recette le jour où il a RÉELLEMENT été encaissé, pas
  // seulement une fois le crédit intégralement soldé. On parcourt donc
  // chaque paiement de chaque vente à crédit (pas seulement `sorted`, dont
  // le filtre porte sur la date de la vente, pas celle des règlements) et
  // on ne garde que ceux tombés dans la période affichée.
  const creditCollectedInPeriod = scoped
    .filter((s) => s.paymentMethod === "credit")
    .reduce((sum, s) => sum + creditPaymentsOf(s).filter((p) => inRevenuePeriod(p.date)).reduce((s2, p) => s2 + p.amount, 0), 0);
  const revenueInPeriod = cashInPeriod + creditCollectedInPeriod;
  const PERIOD_LABELS = { all: "totale", today: "aujourd'hui", "7j": "sur 7 jours", "30j": "sur 30 jours", custom: "sur la plage" };
  const periodLabel = PERIOD_LABELS[periodFilter] || "";
  return (
    <div className="px-4 pt-4 pb-28">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2.5 mb-3">
        <h2 className="font-display font-bold text-lg flex items-center gap-2 whitespace-nowrap"><History size={18} color="#0F6E56" /> {vendorFilter ? "Mes ventes" : "Historique des ventes"}</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {onReturnSale && <button onClick={() => setFinderOpen(true)} className="gb-focus flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "#E1F5EE", color: "#0F6E56" }}><Undo2 size={13} /> Retour</button>}
          <button onClick={() => exportSalesCSV(sorted, pushToast)} className="gb-focus flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "#E6F1FB", color: "#185FA5" }}><Download size={13} /> CSV</button>
          <button onClick={() => setPdfPreview(true)} className="gb-focus flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white" style={{ background: "var(--glass)" }}><Printer size={13} /> PDF</button>
        </div>
      </div>

      {pdfPreview && <SalesPdfPreview shop={shop} sales={sorted} vendorFilter={vendorFilter} onClose={() => setPdfPreview(false)} pushToast={pushToast} />}

      <div className="flex gap-2 overflow-x-auto gb-scroll mb-3">
        {[{ id: "all", label: "Tout" }, { id: "today", label: "Aujourd'hui" }, { id: "7j", label: "7 jours" }, { id: "30j", label: "30 jours" }, { id: "custom", label: "Plage", Icon: CalendarCheck }].map((p) => (
          <button key={p.id} onClick={() => setPeriodFilter(p.id)} className="gb-focus shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold" style={{ background: periodFilter === p.id ? "#0F6E56" : "var(--card)", color: periodFilter === p.id ? "#fff" : "var(--ink)", border: periodFilter === p.id ? "none" : "1px solid var(--line)" }}>{p.Icon && <p.Icon size={12} />}{p.label}</button>
        ))}
      </div>
      {periodFilter === "custom" && (
        <div className="flex items-center gap-2 mb-3 p-2.5 rounded-xl gb-slide-up" style={{ background: "#E1F5EE" }}>
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="gb-focus flex-1 rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "#9FE1CB", background: "var(--card)" }} />
          <span className="text-xs font-semibold" style={{ color: "#0F6E56" }}>à</span>
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="gb-focus flex-1 rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "#9FE1CB", background: "var(--card)" }} />
        </div>
      )}

      {vendorFilter && <VendorGoalCard shop={shop} sales={sales} vendorName={vendorFilter} />}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <StatCard icon={TrendingUp} label={`Recette ${periodLabel}`} value={fmt(revenueInPeriod)} dark compact />
        <StatCard icon={Receipt} label={`Ventes ${periodLabel}`} value={sorted.length} tintBg="#E6F1FB" tintFg="#185FA5" compact />
      </div>
      {(creditCollectedInPeriod > 0 || creditGivenUnpaidInPeriod > 0) && (
        <div className="flex flex-col gap-1 px-1 mb-4">
          {creditCollectedInPeriod > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs opacity-50">Dont crédits encaissés {periodLabel} (inclus)</span>
              <span className="font-mono text-xs font-semibold">{fmt(creditCollectedInPeriod)}</span>
            </div>
          )}
          {creditGivenUnpaidInPeriod > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs opacity-50">Nouveaux crédits accordés (non inclus)</span>
              <span className="font-mono text-xs font-semibold" style={{ color: "var(--danger)" }}>{fmt(creditGivenUnpaidInPeriod)}</span>
            </div>
          )}
        </div>
      )}

      {sorted.length === 0 && <p className="text-sm opacity-50 py-6 text-center">Aucune vente pour l'instant.</p>}
      <div className="flex flex-col gap-2.5">
        {sorted.map((s) => {
          const unpaid = s.paymentMethod === "credit" && !s.paid;
          const PayIcon = s.paymentMethod === "especes" ? Banknote : s.paymentMethod === "mobile" ? Smartphone : AlertTriangle;
          const payTint = unpaid ? { bg: "#FCEBEB", fg: "#A32D2D" } : s.paymentMethod === "mobile" ? { bg: "#E6F1FB", fg: "#0C447C" } : { bg: "#EAF3DE", fg: "#27500A" };
          const rets = saleReturnsOf(s);
          const fullyReturned = rets.length > 0 && s.items.length === 0;
          return (
          <div key={s.id} className="relative rounded-2xl overflow-hidden" style={{ border: unpaid ? "1.5px solid var(--danger)" : "1px solid var(--line)", background: "var(--card)", boxShadow: unpaid ? "0 4px 14px rgba(163,45,45,0.18)" : "0 4px 14px rgba(0,0,0,0.08)" }}>
            <button
              onClick={(e) => { e.stopPropagation(); setReprintSale(s); }}
              className="gb-focus absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: "var(--paper-dim)" }}
              aria-label="Réimprimer le reçu"
            >
              <Printer size={13} />
            </button>
            <button onClick={() => setOpen(open === s.id ? null : s.id)} className="gb-focus w-full flex items-center gap-3 p-3.5 pr-11">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: payTint.bg }}>
                <PayIcon size={16} color={payTint.fg} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-semibold flex items-center gap-1.5 flex-wrap">
                  <span>{new Date(s.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} · {new Date(s.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="text-[10px] font-mono font-normal opacity-40">N° {receiptNumber(s.id)}</span>
                </div>
                <div className="text-xs opacity-50 flex items-center gap-1.5 mt-1 flex-wrap">
                  <span>{(!vendorFilter || s.vendor !== vendorFilter) ? `${s.vendor} · ${s.items.length} article${s.items.length > 1 ? "s" : ""}` : `${s.items.length} article${s.items.length > 1 ? "s" : ""}`}</span>
                </div>
                <span className="inline-block mt-1.5 mr-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wide" style={{ background: payTint.bg, color: payTint.fg }}>
                  {PAYMENT_LABELS[s.paymentMethod]?.toUpperCase()}{unpaid ? " · IMPAYÉ" : ""}
                </span>
                {rets.length > 0 && (
                  <span className="inline-block mt-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wide" style={{ background: "#E1F5EE", color: "#0F6E56" }}>{fullyReturned ? "RETOURNÉE" : "RETOUR PARTIEL"}</span>
                )}
                {s.paymentMethod === "credit" && s.paid && s.paidBy && (
                  <div className="text-[10px] font-semibold mt-1" style={{ color: "var(--glass)" }}>✓ Crédit encaissé par {s.paidBy}{s.paidDate ? " · " + new Date(s.paidDate).toLocaleDateString("fr-FR") : ""}</div>
                )}
              </div>
              <span className="shrink-0 ml-2 text-right">
                {rets.length > 0 && <span className="block font-mono text-[11px] line-through opacity-45">{fmt(s.originalTotal ?? (s.total + returnedAmountOf(s)))}</span>}
                <span className="font-mono font-bold text-sm" style={{ color: unpaid ? "var(--danger)" : "var(--glass)" }}>{fmt(s.total)}</span>
              </span>
            </button>
            {open === s.id && (
              <div className="px-3.5 pb-3.5 pt-1 border-t gb-slide-up" style={{ borderColor: "var(--line)" }}>
                {s.items.map((i) => (
                  <div key={i.id} className="flex justify-between text-xs font-mono py-0.5 opacity-70"><span>{i.qty}× {i.product.name}</span><span>{fmt(computeItemTotal(i.product, i.qty))}</span></div>
                ))}
                {fullyReturned && <p className="text-xs opacity-60 py-0.5">Tous les articles ont été retournés.</p>}
                {rets.length > 0 && (
                  <div className="mt-2.5 flex flex-col gap-1.5">
                    {rets.map((r) => (
                      <button key={r.id} onClick={() => setViewReturn({ ret: r, sale: s })} className="gb-focus w-full text-left rounded-xl px-3 py-2.5" style={{ background: "#E1F5EE", color: "#0F4F2B" }}>
                        <div className="flex justify-between gap-2 text-[12px] font-bold"><span className="flex items-center gap-1.5"><Undo2 size={12} /> Retour du {new Date(r.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} {new Date(r.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span><span className="font-mono whitespace-nowrap">−{fmt(r.amount)}</span></div>
                        <p className="text-[11px] mt-0.5" style={{ opacity: 0.8 }}>{(r.items || []).map((i) => `${i.qty}× ${i.name}`).join(", ")} · {r.reason}</p>
                        <p className="text-[11px]" style={{ opacity: 0.8 }}>{Number(r.refund) > 0 ? `Remboursé ${fmt(r.refund)} · ${REFUND_LABELS[r.refundMode] || ""}` : "Déduit du crédit"}{r.restocked ? " · remis en stock" : " · non remis en stock"}{r.by ? ` · ${r.by}` : ""}</p>
                      </button>
                    ))}
                  </div>
                )}
                {(s.invoices || []).length > 0 && (
                  <p className="text-[11px] mt-2 opacity-60 flex items-center gap-1.5"><FileText size={12} /> {(s.invoices || []).map((inv) => inv.number).join(" · ")}</p>
                )}
                {s.items.length > 0 && (
                  <div className="grid gap-2 mt-3" style={{ gridTemplateColumns: onReturnSale ? "1fr 1fr" : "1fr" }}>
                    {onReturnSale && <button onClick={() => setReturningSale(s)} className="gb-focus flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-xl" style={{ background: "#E1F5EE", color: "#0F6E56" }}><Undo2 size={14} /> Retour produit</button>}
                    <button onClick={() => setInvoiceSale(s)} className="gb-focus flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-xl" style={{ background: "#E6EEFA", color: "#173F70" }}><FileText size={14} /> Facture</button>
                  </div>
                )}
                {isAdmin && (
                  <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: "var(--line)" }}>
                    <button onClick={() => setEditingSale(s)} className="gb-focus flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl" style={{ background: "var(--paper-dim)" }}><Pencil size={13} /> Modifier</button>
                    <button onClick={() => setConfirmDelete(s)} className="gb-focus flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl" style={{ background: "var(--paper-dim)", color: "var(--danger)" }}><Trash2 size={13} /> Supprimer</button>
                  </div>
                )}
              </div>
            )}
          </div>
          );
        })}
      </div>

      {finderOpen && <ReturnFinderModal sales={scoped} onPick={(sale) => { setFinderOpen(false); setReturningSale(sale); }} onClose={() => setFinderOpen(false)} />}
      {returningSale && <SaleReturnFlow sale={returningSale} shop={shop} onReturnSale={onReturnSale} onClose={() => setReturningSale(null)} pushToast={pushToast} />}
      {invoiceSale && <InvoiceModal sale={sales.find((x) => x.id === invoiceSale.id) || invoiceSale} sales={sales} shop={shop} onSaveInvoice={onSaveInvoice} onClose={() => setInvoiceSale(null)} pushToast={pushToast} />}
      {viewReturn && <ReturnReceiptModal ret={viewReturn.ret} sale={viewReturn.sale} shop={shop} onClose={() => setViewReturn(null)} pushToast={pushToast} />}

      {editingSale && (
        <EditSaleModal
          sale={editingSale}
          products={products}
          onSave={(id, items, method) => { onUpdateSale(id, items, method); setEditingSale(null); }}
          onClose={() => setEditingSale(null)}
          pushToast={pushToast}
        />
      )}

      {reprintSale && (
        reprintSale.paymentMethod === "credit" && reprintSale.paid ? (
          <CreditReceiptModal sale={reprintSale} shop={shop} onClose={() => setReprintSale(null)} pushToast={pushToast} />
        ) : (
          <SaleReceiptModal receipt={reprintSale} shop={shop} clients={clients || []} onClose={() => setReprintSale(null)} pushToast={pushToast} />
        )
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center no-print" style={{ background: "rgba(0,0,0,0.45)" }} onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-[430px] rounded-t-3xl p-5 gb-slide-up" style={{ background: "var(--paper)" }} onClick={(e) => e.stopPropagation()}>
            <div className="w-11 h-11 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "var(--paper-dim)" }}><AlertTriangle size={20} color="var(--danger)" /></div>
            <p className="font-display font-bold text-base text-center mb-1">Supprimer cette vente ?</p>
            <p className="text-xs opacity-60 text-center mb-5">Le stock vendu sera restitué automatiquement. Cette action est irréversible.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="gb-focus flex-1 rounded-2xl py-3 font-semibold text-sm" style={{ background: "var(--paper-dim)" }}>Annuler</button>
              <button onClick={() => { onDeleteSale(confirmDelete.id); setConfirmDelete(null); }} className="gb-focus flex-1 rounded-2xl py-3 font-semibold text-sm text-white" style={{ background: "var(--danger)" }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditSaleModal({ sale, products, onSave, onClose, pushToast }) {
  const fmt = useFmt();
  const [items, setItems] = useState(sale.items.map((i) => ({ ...i })));
  const [paymentMethod, setPaymentMethod] = useState(sale.paymentMethod);
  // Ligne en cours de remplacement d'article ("swap") : soit l'id d'une
  // ligne existante (on remplace son article), soit "new" (on ajoute une
  // ligne). null = aucun sélecteur ouvert.
  const [swapTarget, setSwapTarget] = useState(null);
  const [productSearch, setProductSearch] = useState("");
  const total = items.reduce((s, i) => s + computeItemTotal(i.product, i.qty), 0);

  // Stock disponible pour un article donné dans le contexte de CETTE
  // modification : le stock actuel, plus la quantité déjà vendue de ce même
  // article dans la vente ORIGINALE (puisque ce stock lui a déjà été
  // décompté et peut donc lui être re-attribué). Un article qui ne faisait
  // pas partie de la vente d'origine n'a droit qu'à son stock disponible tel
  // quel — c'est ce qui rend le remplacement d'article sûr : on ne peut
  // jamais fabriquer du stock qui n'existe pas.
  const maxQty = (item) => {
    const live = products.find((p) => p.id === item.id);
    const originalQty = sale.items.find((i) => i.id === item.id)?.qty || 0;
    return (live ? live.stock : 0) + originalQty;
  };

  const updateQty = (id, delta) => {
    setItems((prev) => prev.map((i) => {
      if (i.id !== id) return i;
      const next = i.qty + delta;
      if (delta > 0 && next > maxQty(i)) { pushToast("Stock insuffisant pour augmenter cette ligne", "error"); return i; }
      return { ...i, qty: next };
    }).filter((i) => i.qty > 0));
  };

  const removeLine = (id) => setItems((prev) => prev.filter((i) => i.id !== id));

  // Remplace l'article d'une ligne existante par un autre, en conservant la
  // quantité (ajustée si le nouvel article n'a pas assez de stock). Si
  // l'article choisi est déjà présent sur une autre ligne, les deux lignes
  // sont fusionnées plutôt que dupliquées. L'ancienne ligne restitue
  // automatiquement son stock au moment de l'enregistrement (handleUpdateSale
  // compare l'ancienne et la nouvelle liste article par article), et le
  // nouvel article voit son stock décompté — le tout appliqué uniquement à la
  // validation, pas pendant qu'on compose l'aperçu.
  const swapLine = (lineId, newProduct) => {
    const line = items.find((i) => i.id === lineId);
    if (!line) return;
    const cap = maxQty({ id: newProduct.id });
    if (cap <= 0) { pushToast(`${newProduct.name} est en rupture de stock`, "error"); return; }
    const qty = Math.min(line.qty, cap);
    if (qty < line.qty) pushToast(`Quantité ajustée à ${qty} (stock disponible pour ${newProduct.name})`, "ok");
    setItems((prev) => {
      const withoutOldLine = prev.filter((i) => i.id !== lineId);
      const existing = withoutOldLine.find((i) => i.id === newProduct.id);
      if (existing) {
        const mergedQty = Math.min(existing.qty + qty, maxQty(existing));
        return withoutOldLine.map((i) => (i.id === newProduct.id ? { ...i, qty: mergedQty } : i));
      }
      return [...withoutOldLine, { id: newProduct.id, product: newProduct, qty }];
    });
    setSwapTarget(null);
    setProductSearch("");
  };

  // Ajoute un article qui ne faisait pas partie de la vente d'origine.
  const addLine = (product) => {
    const cap = maxQty({ id: product.id });
    if (cap <= 0) { pushToast(`${product.name} est en rupture de stock`, "error"); return; }
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        if (existing.qty >= cap) { pushToast("Stock insuffisant pour augmenter cette ligne", "error"); return prev; }
        return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { id: product.id, product, qty: 1 }];
    });
    setSwapTarget(null);
    setProductSearch("");
  };

  const save = () => {
    if (items.length === 0) { pushToast("La vente doit contenir au moins un article", "error"); return; }
    onSave(sale.id, items, paymentMethod);
  };

  const pickerResults = swapTarget
    ? products.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    : [];

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center no-print" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div className="w-full max-w-[430px] rounded-t-3xl p-5 gb-slide-up max-h-[85vh] overflow-y-auto gb-scroll" style={{ background: "var(--paper)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-base">Modifier la vente</h3>
          <button onClick={onClose} className="gb-focus w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--paper-dim)" }}><X size={16} /></button>
        </div>

        {swapTarget ? (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-sm font-semibold">{swapTarget === "new" ? "Ajouter un article" : "Remplacer par"}</p>
              <button onClick={() => { setSwapTarget(null); setProductSearch(""); }} className="gb-focus text-xs font-semibold opacity-60 underline">Annuler</button>
            </div>
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-3" style={{ background: "var(--paper-dim)" }}>
              <Search size={15} className="opacity-50 shrink-0" />
              <input autoFocus value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Rechercher un produit" className="gb-focus bg-transparent outline-none text-sm flex-1 min-w-0" />
            </div>
            <div className="flex flex-col gap-1 max-h-[45vh] overflow-y-auto gb-scroll">
              {pickerResults.map((p) => {
                const available = maxQty({ id: p.id });
                const disabled = available <= 0;
                return (
                  <button
                    key={p.id}
                    disabled={disabled}
                    onClick={() => (swapTarget === "new" ? addLine(p) : swapLine(swapTarget, p))}
                    className="gb-focus flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left"
                    style={{ background: "var(--paper-dim)", opacity: disabled ? 0.4 : 1 }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{p.name}</p>
                      <p className="text-xs opacity-50 font-mono">{fmt(p.price)} · {disabled ? "rupture de stock" : `${available} en stock`}</p>
                    </div>
                  </button>
                );
              })}
              {pickerResults.length === 0 && <p className="text-xs opacity-50 text-center py-4">Aucun produit trouvé.</p>}
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1 mb-3">
              {items.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-2 py-2.5 border-b" style={{ borderColor: "var(--line)" }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{i.product.name}</p>
                    <p className="text-xs opacity-50 font-mono">{fmt(computeItemTotal(i.product, i.qty))}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => setSwapTarget(i.id)} className="gb-focus w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--paper-dim)" }} aria-label={`Changer l'article ${i.product.name}`}><RefreshCw size={13} /></button>
                    <button onClick={() => updateQty(i.id, -1)} className="gb-focus w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--paper-dim)" }}><Minus size={13} /></button>
                    <span className="w-6 text-center text-sm font-mono">{i.qty}</span>
                    <button onClick={() => updateQty(i.id, 1)} className="gb-focus w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--paper-dim)" }}><Plus size={13} /></button>
                    <button onClick={() => removeLine(i.id)} className="gb-focus w-7 h-7 rounded-full flex items-center justify-center ml-1" style={{ background: "var(--paper-dim)", color: "var(--danger)" }}><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="text-xs opacity-50 text-center py-4">Tous les articles ont été retirés.</p>}
            </div>

            <button onClick={() => setSwapTarget("new")} className="gb-focus w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold mb-4" style={{ background: "var(--paper-dim)" }}>
              <PackagePlus size={14} /> Ajouter un article
            </button>

            <p className="text-xs font-semibold opacity-60 mb-2">Mode de paiement</p>
            <div className="flex gap-2 mb-5">
              {PAYMENT_METHODS.map((m) => (
                <button key={m.id} onClick={() => setPaymentMethod(m.id)} className="gb-focus flex-1 rounded-xl py-2 text-xs font-semibold" style={{ background: paymentMethod === m.id ? "var(--glass)" : "var(--paper-dim)", color: paymentMethod === m.id ? "#fff" : "var(--ink)" }}>
                  {m.label}
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center mb-4">
              <span className="text-sm opacity-60">Nouveau total</span>
              <span className="font-mono font-bold text-lg" style={{ color: "var(--glass)" }}>{fmt(total)}</span>
            </div>

            <button onClick={save} className="gb-focus w-full rounded-2xl py-3.5 font-semibold text-sm text-white flex items-center justify-center gap-2" style={{ background: "var(--glass)" }}>
              <Check size={16} /> Enregistrer les modifications
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Écran crédits ---------- */

// ---------- Retours produits ----------
// Fenêtre de retour : choix des articles et quantités rendus, motif, remise
// en stock et mode de remboursement. Le calcul (valeur retournée, part
// déduite du crédit, somme à rendre) est affiché avant validation.
function ReturnSaleModal({ sale, onConfirm, onClose }) {
  const fmt = useFmt();
  const [qty, setQty] = useState(() => Object.fromEntries(sale.items.map((i) => [i.id, 0])));
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [restock, setRestock] = useState(true);
  const [restockTouched, setRestockTouched] = useState(false);
  const [mode, setMode] = useState(sale.paymentMethod === "mobile" ? "mobile" : "especes");
  const [busy, setBusy] = useState(false);
  const isCredit = sale.paymentMethod === "credit";
  const lines = sale.items.map((i) => ({ item: i, q: Math.min(i.qty, Math.max(0, qty[i.id] || 0)) }));
  const oldSum = sale.items.reduce((t, i) => t + computeItemTotal(i.product, i.qty), 0);
  const newSum = lines.reduce((t, l) => t + computeItemTotal(l.item.product, l.item.qty - l.q), 0);
  const amount = Math.max(0, Math.min(Number(sale.total) || 0, oldSum - newSum));
  const count = lines.reduce((t, l) => t + l.q, 0);
  const newTotal = Math.max(0, (Number(sale.total) || 0) - amount);
  const paidSoFar = isCredit ? creditPaidSoFar(sale) : Number(sale.total) || 0;
  const refund = isCredit ? Math.max(0, paidSoFar - newTotal) : amount;
  const creditReduced = Math.max(0, amount - refund);
  const allSelected = lines.every((l) => l.q === l.item.qty);
  const setLine = (id, v, max) => setQty((prev) => ({ ...prev, [id]: Math.max(0, Math.min(max, v)) }));
  const pickReason = (r) => { setReason(r); if (!restockTouched) setRestock(!RETURN_NO_RESTOCK_REASONS.includes(r)); };
  const canConfirm = count > 0 && !!reason && !busy;
  const confirm = () => {
    if (!canConfirm) return;
    setBusy(true);
    onConfirm({ lines: lines.filter((l) => l.q > 0).map((l) => ({ id: l.item.id, qty: l.q })), reason, note, restock, refundMode: refund > 0 ? mode : "credit" });
  };
  const MODES = [
    { id: "especes", label: "Espèces", Icon: Banknote, hint: "Sort de la caisse" },
    { id: "mobile", label: "Mobile Money", Icon: Smartphone, hint: "Renvoyé par MoMo" },
    { id: "avoir", label: "Avoir client", Icon: Coins, hint: "À rendre plus tard" },
  ];
  return (
    <div className="fixed inset-0 z-[93] flex items-end sm:items-center justify-center no-print" style={{ background: "rgba(22,32,42,0.55)", padding: "max(24px, env(safe-area-inset-top)) 0 0" }} onClick={onClose}>
      <div className="w-full max-w-[440px] rounded-t-[26px] sm:rounded-[26px] flex flex-col gb-slide-up" style={{ background: "var(--paper)", maxHeight: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pt-4 pb-3 flex items-center gap-3 shrink-0" style={{ borderBottom: "1px solid var(--line)" }}>
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "#E1F5EE" }}><Undo2 size={20} color="#0F6E56" /></div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-[18px] leading-tight">Retour produit</p>
            <p className="text-[12px] opacity-60">Vente N° {receiptNumber(sale.id)} · {new Date(sale.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} {new Date(sale.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}{sale.clientName ? ` · ${sale.clientName}` : ""}</p>
          </div>
          <button onClick={onClose} className="gb-focus w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }} aria-label="Fermer"><X size={18} /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto gb-scroll px-5 pt-4 pb-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[12px] font-bold uppercase tracking-wider opacity-60">Articles rendus</p>
            <button onClick={() => setQty(Object.fromEntries(sale.items.map((i) => [i.id, allSelected ? 0 : i.qty])))} className="gb-focus text-[12.5px] font-bold px-3 py-1.5 rounded-full" style={{ background: allSelected ? "var(--paper-dim)" : "#E1F5EE", color: allSelected ? "var(--ink)" : "#0F6E56" }}>{allSelected ? "Tout désélectionner" : "Tout retourner"}</button>
          </div>
          <div className="flex flex-col gap-2 mb-4">
            {lines.map(({ item, q }) => (
              <div key={item.id} className="rounded-2xl p-3 flex items-center gap-3" style={{ background: "var(--card)", border: q > 0 ? "1.5px solid #0F6E56" : "1px solid var(--line)" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-[14.5px] font-semibold break-words">{item.product?.name}</p>
                  <p className="text-[12px] opacity-60">Vendu : {item.qty} × {fmt(Number(item.product?.price) || 0)}</p>
                  {q > 0 && <p className="text-[12px] font-bold mt-0.5" style={{ color: "#0F6E56" }}>Retour : {fmt(computeItemTotal(item.product, item.qty) - computeItemTotal(item.product, item.qty - q))}</p>}
                </div>
                <div className="flex items-center rounded-xl shrink-0" style={{ background: "var(--paper-dim)" }}>
                  <button onClick={() => setLine(item.id, q - 1, item.qty)} disabled={q <= 0} className="gb-focus w-10 h-10 flex items-center justify-center disabled:opacity-30" aria-label="Moins"><Minus size={16} /></button>
                  <span className="w-8 text-center font-mono font-bold text-[15px]">{q}</span>
                  <button onClick={() => setLine(item.id, q + 1, item.qty)} disabled={q >= item.qty} className="gb-focus w-10 h-10 flex items-center justify-center disabled:opacity-30" aria-label="Plus"><Plus size={16} /></button>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[12px] font-bold uppercase tracking-wider opacity-60 mb-2">Motif du retour</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {RETURN_REASONS.map((r) => (
              <button key={r} onClick={() => pickReason(r)} className="gb-focus px-3.5 py-2 rounded-full text-[13px] font-semibold" style={{ background: reason === r ? "#1F2A33" : "var(--card)", color: reason === r ? "#fff" : "var(--ink)", border: reason === r ? "1px solid #1F2A33" : "1px solid var(--line)" }}>{r}</button>
            ))}
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Précision (facultatif)" className="gb-focus w-full rounded-xl px-3.5 py-3 text-[14px] mb-4" style={{ background: "var(--card)", border: "1px solid var(--line)" }} />

          <button type="button" onClick={() => { setRestock(!restock); setRestockTouched(true); }} className="gb-focus w-full rounded-2xl p-3.5 flex items-center gap-3 text-left mb-4" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold">Remettre les articles en stock</p>
              <p className="text-[12px] opacity-60">{restock ? "Les articles rendus seront revendables." : "Articles abîmés ou périmés : ils ne reviennent pas dans le stock."}</p>
            </div>
            <span className="w-12 h-7 rounded-full relative shrink-0 transition-colors" style={{ background: restock ? "#1E8E50" : "#C9C6BC" }}>
              <span className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all" style={{ left: restock ? 22 : 2 }} />
            </span>
          </button>

          {count > 0 && (
            <div className="rounded-2xl p-3.5 mb-4" style={{ background: "#fff", border: "1px solid #E6E4DD", color: "#16202A" }}>
              <div className="flex justify-between text-[13.5px] py-1"><span style={{ color: "#5B6470" }}>Valeur retournée ({count} article{count > 1 ? "s" : ""})</span><b className="font-mono whitespace-nowrap">{fmt(amount)}</b></div>
              {creditReduced > 0 && <div className="flex justify-between text-[13.5px] py-1"><span style={{ color: "#5B6470" }}>Déduit du crédit restant</span><b className="font-mono whitespace-nowrap">{fmt(creditReduced)}</b></div>}
              <div className="flex justify-between text-[13.5px] py-1"><span style={{ color: "#5B6470" }}>Nouveau total de la vente</span><b className="font-mono whitespace-nowrap">{fmt(newTotal)}</b></div>
              <div className="flex justify-between items-center mt-2 px-3 py-2.5 rounded-xl" style={{ background: refund > 0 ? "#FFF1D6" : "#EAF6EF", color: refund > 0 ? "#6E3C00" : "#0F4F2B" }}>
                <span className="text-[13.5px] font-bold">{refund > 0 ? "À rembourser au client" : "Rien à rembourser"}</span>
                <span className="font-display font-bold text-[18px] whitespace-nowrap">{fmt(refund)}</span>
              </div>
            </div>
          )}

          {count > 0 && refund > 0 && (
            <>
              <p className="text-[12px] font-bold uppercase tracking-wider opacity-60 mb-2">Mode de remboursement</p>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {MODES.map(({ id, label, Icon, hint }) => (
                  <button key={id} onClick={() => setMode(id)} className="gb-focus rounded-2xl py-3 px-1.5 flex flex-col items-center gap-1 text-center" style={{ background: mode === id ? "#1F2A33" : "var(--card)", color: mode === id ? "#fff" : "var(--ink)", border: mode === id ? "1px solid #1F2A33" : "1px solid var(--line)" }}>
                    <Icon size={18} />
                    <span className="text-[12.5px] font-bold leading-tight">{label}</span>
                    <span className="text-[10.5px] leading-tight" style={{ opacity: 0.7 }}>{hint}</span>
                  </button>
                ))}
              </div>
              {mode === "especes" && <p className="text-[12px] opacity-60 mb-1">Ce montant sera déduit des espèces attendues à la clôture de caisse.</p>}
              {mode === "avoir" && <p className="text-[12px] opacity-60 mb-1">Un avoir monnaie de {fmt(refund)} sera créé{sale.clientName ? ` pour ${sale.clientName}` : ""} (onglet Position › Avoir).</p>}
            </>
          )}
        </div>

        <div className="px-5 pt-3 shrink-0" style={{ borderTop: "1px solid var(--line)", background: "var(--paper)", paddingBottom: "max(18px, calc(env(safe-area-inset-bottom) + 12px))" }}>
          {!reason && count > 0 && <p className="text-[12px] text-center mb-2" style={{ color: "#8A4B00" }}>Choisissez le motif du retour</p>}
          <button onClick={confirm} disabled={!canConfirm} className="gb-focus w-full min-h-[54px] rounded-2xl text-white font-bold text-[15px] flex items-center justify-center gap-2 disabled:opacity-40" style={{ background: "#0F6E56" }}>
            <Check size={18} /> {count === 0 ? "Sélectionnez les articles rendus" : `Valider le retour${refund > 0 ? ` · ${fmt(refund)}` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// Bon de retour à l'écran (après validation, ou depuis l'historique) :
// impression thermique et partage.
function ReturnReceiptModal({ ret, sale, shop, onClose, pushToast }) {
  const fmt = useFmt();
  const [busy, setBusy] = useState(false);
  const dt = (d) => new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const plain = (v) => String(v).replace(/[  ]/g, " ").replace(/−/g, "-");
  const text = [
    `${shop?.name || ""} — Bon de retour`,
    `Vente N° ${receiptNumber(sale.id)} du ${new Date(sale.date).toLocaleDateString("fr-FR")}`,
    `Retour le ${dt(ret.date)}${ret.by ? ` par ${ret.by}` : ""}`,
    "",
    ...(ret.items || []).map((i) => `${i.qty} × ${i.name} : ${fmt(i.value)}`),
    "",
    `Valeur retournée : ${fmt(ret.amount)}`,
    ...(Number(ret.creditReduced) > 0 ? [`Déduit du crédit : ${fmt(ret.creditReduced)}`] : []),
    ...(Number(ret.refund) > 0 ? [`Remboursé : ${fmt(ret.refund)} (${REFUND_LABELS[ret.refundMode] || ""})`] : []),
    `Motif : ${ret.reason}${ret.note ? ` — ${ret.note}` : ""}`,
    ret.restocked ? "Articles remis en stock" : "Articles non remis en stock",
  ].map(plain).join("\n");
  const doPrint = async () => {
    setBusy(true);
    try { await printReturnReceipt(ret, sale, shop, fmt); }
    catch (e) { pushToast?.(e?.message || "Impression impossible", "error"); }
    setBusy(false);
  };
  return (
    <div className="fixed inset-0 z-[94] flex items-end sm:items-center justify-center no-print" style={{ background: "rgba(22,32,42,0.55)", padding: "max(24px, env(safe-area-inset-top)) 0 0" }} onClick={onClose}>
      <div className="w-full max-w-[440px] rounded-t-[26px] sm:rounded-[26px] flex flex-col gb-slide-up" style={{ background: "var(--paper)", maxHeight: "100%", paddingBottom: "max(18px, calc(env(safe-area-inset-bottom) + 12px))" }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pt-4 pb-3 flex items-center gap-3 shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold uppercase tracking-wider opacity-60">Retour enregistré</p>
            <p className="font-display font-bold text-[19px] leading-tight">Bon de retour</p>
          </div>
          <button onClick={onClose} className="gb-focus w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }} aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto gb-scroll px-5">
          <div className="rounded-[20px] p-4 mb-3" style={{ background: "#fff", color: "#16202A", border: "1px solid #E6E4DD" }}>
            <div className="text-center pb-3 mb-2" style={{ borderBottom: "1.5px dashed #D5D2C8" }}>
              <p className="font-display font-bold text-[17px] break-words">{shop?.name}</p>
              <p className="text-[12px] mt-1" style={{ color: "#5B6470" }}>Vente N° {receiptNumber(sale.id)} du {new Date(sale.date).toLocaleDateString("fr-FR")}</p>
              <p className="text-[12px]" style={{ color: "#5B6470" }}>Retour le {dt(ret.date)}{ret.by ? ` · ${ret.by}` : ""}</p>
              {sale.clientName && <p className="text-[12px] font-semibold mt-0.5">Client : {sale.clientName}</p>}
            </div>
            {(ret.items || []).map((i) => (
              <div key={i.id} className="flex justify-between gap-3 py-1.5 text-[14px]"><span className="min-w-0 break-words">{i.qty} × {i.name}</span><span className="font-mono font-semibold whitespace-nowrap">{fmt(i.value)}</span></div>
            ))}
            <div className="mt-2 pt-2 flex flex-col gap-1 text-[13.5px]" style={{ borderTop: "1px solid #EFEDE7" }}>
              <div className="flex justify-between"><span style={{ color: "#5B6470" }}>Valeur retournée</span><b className="font-mono">{fmt(ret.amount)}</b></div>
              {Number(ret.creditReduced) > 0 && <div className="flex justify-between"><span style={{ color: "#5B6470" }}>Déduit du crédit</span><b className="font-mono">{fmt(ret.creditReduced)}</b></div>}
            </div>
            <div className="flex justify-between items-center gap-3 mt-3 px-3.5 py-3 rounded-2xl" style={{ background: Number(ret.refund) > 0 ? "#FFF1D6" : "#EAF6EF", color: Number(ret.refund) > 0 ? "#6E3C00" : "#0F4F2B" }}>
              <span className="text-[13.5px] font-bold leading-tight">{Number(ret.refund) > 0 ? `Remboursé · ${REFUND_LABELS[ret.refundMode] || ""}` : "Aucun remboursement"}</span>
              <span className="font-display font-bold text-[19px] whitespace-nowrap">{fmt(ret.refund || 0)}</span>
            </div>
            <p className="text-[12.5px] mt-3" style={{ color: "#4A525C" }}>Motif : <b>{ret.reason}</b>{ret.note ? ` — ${ret.note}` : ""}</p>
            <p className="text-[12.5px]" style={{ color: ret.restocked ? "#1E8E50" : "#8A4B00" }}>{ret.restocked ? "Articles remis en stock" : "Articles non remis en stock"}</p>
          </div>
        </div>
        <div className="px-5 pt-2 grid gap-2 shrink-0" style={{ gridTemplateColumns: isPrinterFeatureAvailable() ? "1fr 1fr" : "1fr" }}>
          {isPrinterFeatureAvailable() && (
            <button onClick={doPrint} disabled={busy} className="gb-focus min-h-[50px] rounded-2xl text-white text-[14px] font-bold flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: "#1F2A33" }}><Printer size={17} />{busy ? "…" : "Imprimer"}</button>
          )}
          <button onClick={() => shareText("Bon de retour", text).catch(() => {})} className="gb-focus min-h-[50px] rounded-2xl text-[14px] font-bold flex items-center justify-center gap-2" style={{ background: "#EAF6EF", color: "#0F4F2B" }}><Send size={17} />Partager</button>
        </div>
      </div>
    </div>
  );
}

// Enchaîne la fenêtre de retour puis le bon de retour.
function SaleReturnFlow({ sale, shop, onReturnSale, onClose, pushToast }) {
  const [done, setDone] = useState(null);
  if (done) return <ReturnReceiptModal ret={done.ret} sale={done.sale} shop={shop} onClose={onClose} pushToast={pushToast} />;
  return (
    <ReturnSaleModal sale={sale} onClose={onClose} onConfirm={(payload) => {
      const res = onReturnSale?.(sale.id, payload);
      if (res) setDone(res); else onClose();
    }} />
  );
}

// Retrouver une vente par son numéro de reçu (saisi ou scanné) pour faire
// un retour, quelle que soit la période affichée dans l'historique.
function ReturnFinderModal({ sales, onPick, onClose }) {
  const fmt = useFmt();
  const [code, setCode] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const search = (raw) => {
    const digits = String(raw || "").replace(/\D/g, "");
    if (!digits) return;
    const sale = sales.find((s) => receiptNumber(s.id) === digits);
    if (!sale) { setMsg("Aucune vente ne correspond à ce numéro."); return; }
    if (!sale.items || sale.items.length === 0) { setMsg("Cette vente a déjà été entièrement retournée."); return; }
    onPick(sale);
  };
  const recent = [...sales].filter((s) => s.items?.length).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  return (
    <div className="fixed inset-0 z-[92] flex items-end sm:items-center justify-center no-print" style={{ background: "rgba(22,32,42,0.55)", padding: "max(24px, env(safe-area-inset-top)) 0 0" }} onClick={onClose}>
      <div className="w-full max-w-[440px] rounded-t-[26px] sm:rounded-[26px] flex flex-col gb-slide-up" style={{ background: "var(--paper)", maxHeight: "100%", paddingBottom: "max(18px, calc(env(safe-area-inset-bottom) + 12px))" }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pt-4 pb-2 flex items-center gap-3 shrink-0">
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-[18px] leading-tight">Retour produit</p>
            <p className="text-[12.5px] opacity-60">Scannez le ticket du client ou tapez son numéro.</p>
          </div>
          <button onClick={onClose} className="gb-focus w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }} aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto gb-scroll px-5 pt-2">
          <div className="flex gap-2 mb-2">
            <input value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setMsg(""); }} onKeyDown={(e) => e.key === "Enter" && search(code)} placeholder="Numéro du reçu" inputMode="numeric" className="gb-focus flex-1 min-w-0 rounded-xl px-3.5 py-3 text-[15px] font-mono" style={{ background: "var(--card)", border: "1px solid var(--line)" }} />
            <button onClick={() => setScannerOpen(true)} className="gb-focus w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#E8741E" }} aria-label="Scanner le ticket"><ScanLine size={20} color="#fff" /></button>
          </div>
          <button onClick={() => search(code)} className="gb-focus w-full min-h-[48px] rounded-xl text-white font-bold text-[14px] mb-2" style={{ background: "#0F6E56" }}>Rechercher la vente</button>
          {msg && <p className="text-[13px] text-center py-2" style={{ color: "#8A2419" }}>{msg}</p>}
          {recent.length > 0 && (
            <>
              <p className="text-[12px] font-bold uppercase tracking-wider opacity-60 mt-3 mb-2">Ventes récentes</p>
              <div className="flex flex-col gap-2 pb-2">
                {recent.map((s) => (
                  <button key={s.id} onClick={() => onPick(s)} className="gb-focus w-full rounded-2xl p-3 flex items-center gap-3 text-left" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-semibold">N° {receiptNumber(s.id)} · {new Date(s.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · {new Date(s.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</p>
                      <p className="text-[12px] opacity-60 truncate">{s.items.map((i) => `${i.qty}× ${i.product?.name}`).join(", ")}</p>
                    </div>
                    <span className="font-mono font-bold text-[13.5px] whitespace-nowrap">{fmt(s.total)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      {scannerOpen && <CameraScanner onDetect={(v) => { setScannerOpen(false); setCode(String(v).replace(/\D/g, "")); search(v); }} onClose={() => setScannerOpen(false)} />}
    </div>
  );
}

function SettleCreditModal({ sale, onConfirm, onClose }) {
  const fmt = useFmt();
  const symbol = useCurrencySymbol();
  const alreadyPaid = creditPaidSoFar(sale);
  const remaining = Math.max(0, sale.total - alreadyPaid);
  const [amount, setAmount] = useState(String(remaining));
  const [error, setError] = useState("");

  const submit = () => {
    const value = Number(amount.replace(/[^\d.]/g, ""));
    if (!value || value <= 0) { setError("Entre un montant valide"); return; }
    if (value > remaining + 0.5) { setError(`Le montant dépasse le solde dû (${fmt(remaining)})`); return; }
    onConfirm(value);
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-end no-print">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full rounded-t-3xl p-6 gb-slide-up max-h-[85vh] overflow-y-auto gb-scroll" style={{ background: "var(--card)", paddingBottom: "max(28px, env(safe-area-inset-bottom))" }}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display font-bold text-lg">Encaisser un crédit</h2>
          <button onClick={onClose} className="gb-focus p-1"><X size={20} /></button>
        </div>
        <p className="text-xs opacity-50 mb-4">{sale.clientName || "Client"} · vendu le {new Date(sale.date).toLocaleDateString("fr-FR")}</p>

        <div className="rounded-2xl p-3.5 mb-4 flex items-center justify-between" style={{ background: "#FCEBEB" }}>
          <div>
            <p className="text-[11px] font-semibold" style={{ color: "#A32D2D" }}>Solde restant dû</p>
            <p className="text-xl font-bold" style={{ color: "#A32D2D" }}>{fmt(remaining)}</p>
          </div>
          <Receipt size={24} color="#A32D2D" />
        </div>

        <label className="text-xs font-semibold opacity-60 block mb-1.5">Montant reçu du client ({symbol})</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setError(""); }}
          className="gb-focus w-full rounded-xl px-3 py-3 text-lg font-bold text-center border mb-2"
          style={{ borderColor: error ? "var(--danger)" : "var(--line)" }}
        />
        {error && <p className="text-xs mb-4" style={{ color: "var(--danger)" }}>{error}</p>}

        <button onClick={submit} className="gb-focus w-full rounded-2xl py-3 font-semibold text-sm text-white flex items-center justify-center gap-2 mt-2" style={{ background: "var(--glass)" }}>
          <Banknote size={16} /> Encaisser {amount ? fmt(Number(amount) || 0) : ""}
        </button>
        <p className="text-[11px] opacity-40 text-center mt-2.5">Ajouté à la recette du jour dès l'encaissement.</p>
      </div>
    </div>
  );
}

// Reçu de crédit réutilisable (CreditsScreen + réimpression depuis
// l'historique des ventes) : historique complet des règlements, montant du
// crédit, total réglé, reste à payer (ou "Crédit soldé" si totalement réglé).
function CreditReceiptModal({ sale, shop, onClose, pushToast }) {
  const fmt = useFmt();
  const [printing, setPrinting] = useState(false);
  const notify = (msg, type) => { if (pushToast) pushToast(msg, type); };

  const paidSoFar = creditPaidSoFar(sale);
  const remaining = Math.max(0, sale.total - paidSoFar);
  const payments = creditPaymentsOf(sale);
  const lastPayment = payments[payments.length - 1];

  const handlePrint = async () => {
    if (!isPrinterFeatureAvailable()) {
      const lines = [
        `🧾 Crédit — ${shop.name}`,
        `Client : ${sale.clientName || "Client"}`,
        `Montant du crédit : ${fmt(sale.total)}`,
        `Total réglé à ce jour : ${fmt(paidSoFar)}`,
        remaining > 0 ? `Reste à payer : ${fmt(remaining)}` : "Crédit soldé",
      ];
      try {
        await shareText(`Crédit — ${shop.name}`, lines.join("\n"));
      } catch (e) {
        notify(e.message || "Impossible de partager le reçu.", "error");
      }
      return;
    }
    setPrinting(true);
    try {
      await printCreditReceipt(sale, shop, fmt);
    } catch (e) {
      notify(e.message || "Impossible d'imprimer — vérifiez que RawBT est installé et configuré.", "error");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/50 no-print" onClick={onClose} />
      <div className="relative w-full max-w-xs bg-white rounded-t-2xl gb-pop flex flex-col overflow-hidden" style={{ maxHeight: "85vh" }}>
      <div id="receipt-print-area" className="overflow-y-auto gb-scroll ticket-edge px-5 pt-5" style={{ paddingBottom: 24 }}>
        <div className="text-center">
          <Check size={18} className="mx-auto mb-1.5" style={{ color: "var(--glass)" }} />
          <p className="font-display font-bold text-[12px] tracking-[0.18em] uppercase" style={{ color: "var(--glass)" }}>{remaining > 0 ? "Paiement partiel enregistré" : "Crédit soldé"}</p>
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono opacity-45 mt-3">
          <span>N° {receiptNumber(sale.id)}</span>
          <span>{lastPayment ? new Date(lastPayment.date).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</span>
        </div>

        <div className="border-t border-dashed my-3" style={{ borderColor: "var(--line)" }} />

        <div className="flex justify-between text-xs mb-1.5"><span className="opacity-50">Client</span><span className="font-semibold">{sale.clientName || "Client"}</span></div>
        <div className="flex justify-between text-xs mb-1.5"><span className="opacity-50">Vente initiale</span><span>{new Date(sale.date).toLocaleDateString("fr-FR")}</span></div>
        <div className="flex justify-between text-xs"><span className="opacity-50">Vendu par</span><span className="font-semibold">{sale.vendor}</span></div>

        <div className="border-t border-dashed my-3" style={{ borderColor: "var(--line)" }} />

        <p className="text-[11px] font-semibold uppercase tracking-wide opacity-50 mb-2">Règlements</p>
        <div className="flex flex-col gap-1.5 mb-1">
          {payments.map((p, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="opacity-60">{new Date(p.date).toLocaleDateString("fr-FR")} · {p.by}</span>
              <span className="font-mono font-semibold">{fmt(p.amount)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed my-3" style={{ borderColor: "var(--line)" }} />

        <div className="flex justify-between text-xs mb-1"><span className="opacity-50">Montant du crédit</span><span className="font-mono">{fmt(sale.total)}</span></div>
        <div className="flex justify-between text-xs mb-1"><span className="opacity-50">Total réglé à ce jour</span><span className="font-mono">{fmt(paidSoFar)}</span></div>
        <div className="flex justify-between items-baseline mt-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide opacity-50">{remaining > 0 ? "Reste à payer" : "Crédit soldé"}</span>
          <span className="font-display font-bold text-2xl" style={{ color: remaining > 0 ? "var(--danger)" : "var(--glass)" }}>{remaining > 0 ? fmt(remaining) : fmt(sale.total)}</span>
        </div>

        <div className="border-t border-dashed my-3" style={{ borderColor: "var(--line)" }} />

        <ReceiptCodes id={sale.id} label={`N° ${receiptNumber(sale.id)}`} />

        <div className="text-center">
          <p className="font-display font-bold text-[15px]" style={{ color: "var(--glass)" }}>{shop.name}</p>
          <p className="text-[11px] italic opacity-55 mt-1.5 leading-snug">Merci pour votre confiance.<br />À très bientôt !</p>
        </div>
      </div>
      <div className="px-5 pt-3" style={{ borderTop: "1px solid var(--line)", paddingBottom: "max(18px, env(safe-area-inset-bottom))" }}>
        <div className="flex gap-2">
          <button onClick={onClose} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--paper-dim)" }}>Fermer</button>
          <button onClick={handlePrint} disabled={printing} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-1.5 disabled:opacity-60" style={{ background: "var(--glass)" }}>
            <Printer size={14} /> {printing ? "Impression…" : "Imprimer"}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

function CreditsScreen({ shop, sales, onSettle, pushToast }) {
  const fmt = useFmt();
  const [settling, setSettling] = useState(null);
  const [confirmReceipt, setConfirmReceipt] = useState(null);
  const [periodFilter, setPeriodFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const allOutstanding = [...sales].filter((s) => s.paymentMethod === "credit" && !s.paid).sort((a, b) => new Date(b.date) - new Date(a.date));
  const settled = [...sales].filter((s) => s.paymentMethod === "credit" && s.paid).sort((a, b) => new Date(b.paidDate || b.date) - new Date(a.paidDate || a.date));
  const outstanding = allOutstanding.filter((s) => inPeriod(s.date, periodFilter, customFrom, customTo));
  const totalOutstanding = outstanding.reduce((s, x) => s + (x.total - creditPaidSoFar(x)), 0);

  // Crédits encaissés sur la période : chaque règlement (même partiel) compte
  // à la date où il a réellement été encaissé — même logique que la recette
  // dans l'historique des ventes — pas seulement les crédits totalement
  // soldés à la date de la vente d'origine.
  const collectedPaymentsInPeriod = sales
    .filter((s) => s.paymentMethod === "credit")
    .flatMap((s) => creditPaymentsOf(s).filter((p) => inPeriod(p.date, periodFilter, customFrom, customTo)));
  const totalCollected = collectedPaymentsInPeriod.reduce((s, p) => s + p.amount, 0);

  // Un reçu est proposé après CHAQUE encaissement, partiel ou total — pas
  // seulement quand le crédit est soldé — pour que le vendeur puisse toujours
  // remettre une preuve de paiement au client.
  const handleConfirmSettle = (amount) => {
    const updated = onSettle(settling.id, amount);
    setSettling(null);
    if (updated) setConfirmReceipt(updated);
  };

  return (
    <div className="px-4 pt-4 pb-28">
      <h2 className="font-display font-bold text-lg mb-3">Crédits clients</h2>

      <PeriodFilterBar value={periodFilter} onChange={setPeriodFilter} customFrom={customFrom} customTo={customTo} onCustomFrom={setCustomFrom} onCustomTo={setCustomTo} />

      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="rounded-2xl p-2.5" style={{ background: "var(--glass)" }}>
          <div className="flex items-center gap-1 mb-2">
            <Receipt size={13} color="var(--cap)" />
            <span className="text-[9px]" style={{ color: "var(--cap)" }}>en cours</span>
          </div>
          <div className="font-mono font-bold text-base leading-tight text-white">{outstanding.length}</div>
          <div className="text-[9px] mt-0.5" style={{ color: "#ffffffb0" }}>Crédits en cours</div>
        </div>
        <div className="rounded-2xl p-2.5" style={{ background: "#FCEBEB" }}>
          <div className="flex items-center gap-1 mb-2">
            <AlertTriangle size={13} color="#A32D2D" />
            <span className="text-[9px]" style={{ color: "#A32D2D" }}>{outstanding.length} crédit{outstanding.length > 1 ? "s" : ""}</span>
          </div>
          <div className="font-mono font-bold text-[15px] leading-tight" style={{ color: "#A32D2D" }}>{fmt(totalOutstanding)}</div>
          <div className="text-[9px] mt-0.5" style={{ color: "#A32D2D" }}>Total dû</div>
        </div>
        <div className="rounded-2xl p-2.5" style={{ background: "#EAF3DE" }}>
          <div className="flex items-center gap-1 mb-2">
            <CheckSquare size={13} color="#3B6D11" />
            <span className="text-[9px]" style={{ color: "#3B6D11" }}>{collectedPaymentsInPeriod.length} paiement{collectedPaymentsInPeriod.length > 1 ? "s" : ""}</span>
          </div>
          <div className="font-mono font-bold text-[15px] leading-tight" style={{ color: "#27500A" }}>{fmt(totalCollected)}</div>
          <div className="text-[9px] mt-0.5" style={{ color: "#3B6D11" }}>Crédits encaissés</div>
        </div>
      </div>

      {outstanding.length === 0 && <p className="text-sm opacity-50 text-center py-6">Aucun crédit en cours sur cette période.</p>}
      <div className="flex flex-col gap-2.5 mb-6">
        {outstanding.map((s) => {
          const paidSoFar = creditPaidSoFar(s);
          const remaining = s.total - paidSoFar;
          const hasPartial = paidSoFar > 0;
          return (
            <div key={s.id} className="rounded-2xl p-3.5" style={{ background: "var(--card)", boxShadow: "0 2px 10px rgba(15,27,22,0.07)" }}>
              <div className="flex items-center gap-3 mb-2.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px]" style={{ background: "#FCEBEB", color: "#A32D2D" }}>{initials(s.clientName)}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{s.clientName || "Client"}</div>
                  <div className="text-xs opacity-50">{new Date(s.date).toLocaleDateString("fr-FR")} · {s.vendor}</div>
                </div>
                <span className="font-mono font-bold text-sm shrink-0" style={{ color: "var(--danger)" }}>{fmt(remaining)}</span>
              </div>
              {hasPartial && (
                <div className="mb-2.5">
                  <div className="flex justify-between text-[11px] opacity-50 mb-1">
                    <span>{fmt(paidSoFar)} réglés</span>
                    <span>sur {fmt(s.total)}</span>
                  </div>
                  <div className="h-[5px] rounded-full overflow-hidden" style={{ background: "var(--paper-dim)" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (paidSoFar / s.total) * 100)}%`, background: "#185FA5" }} />
                  </div>
                </div>
              )}
              <button onClick={() => setSettling(s)} className="gb-focus w-full rounded-xl py-2.5 text-xs font-semibold text-white" style={{ background: "#0F6E56" }}>{hasPartial ? "Encaisser le solde" : "Encaisser ce crédit"}</button>
            </div>
          );
        })}
      </div>

      {settled.length > 0 && (
        <>
          <h3 className="font-display font-bold text-base mb-2">Récemment encaissés</h3>

          <div className="flex flex-col gap-2">
            {settled.slice(0, 10).map((s) => (
              <button key={s.id} onClick={() => setConfirmReceipt(s)} className="gb-focus w-full rounded-xl p-3 flex items-center gap-3 text-left" style={{ background: "var(--card)", boxShadow: "0 2px 8px rgba(15,27,22,0.06)" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px]" style={{ background: "#EAF3DE", color: "#27500A" }}>{initials(s.clientName)}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{s.clientName || "Client"}</div>
                  <div className="text-[11px] opacity-50">Encaissé par {s.paidBy}{s.paidDate ? " · " + new Date(s.paidDate).toLocaleDateString("fr-FR") : ""}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="font-mono text-sm font-semibold opacity-60">{fmt(s.total)}</span>
                  <Printer size={13} className="opacity-40" />
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {settling && <SettleCreditModal sale={settling} onConfirm={handleConfirmSettle} onClose={() => setSettling(null)} />}
      {confirmReceipt && <CreditReceiptModal sale={confirmReceipt} shop={shop} onClose={() => setConfirmReceipt(null)} pushToast={pushToast} />}
    </div>
  );
}

// --- Aides de calcul de progression des avoirs (partagées entre la liste et
// le reçu détaillé) --------------------------------------------------------
function avoirTakenByProduct(avoir) {
  const taken = {};
  (avoir.history || []).forEach((h) => h.items.forEach((i) => { taken[i.productId] = (taken[i.productId] || 0) + i.qty; }));
  return taken;
}
function avoirRemainingItems(avoir) {
  const taken = avoirTakenByProduct(avoir);
  return (avoir.items || []).map((i) => ({ ...i, qty: Math.max(0, i.qty - (taken[i.productId] || 0)) })).filter((i) => i.qty > 0);
}
function avoirProductProgress(avoir) {
  const totalQty = (avoir.items || []).reduce((s, i) => s + i.qty, 0);
  const remainingQty = avoirRemainingItems(avoir).reduce((s, i) => s + i.qty, 0);
  const takenQty = totalQty - remainingQty;
  return { totalQty, remainingQty, takenQty, pct: totalQty > 0 ? Math.round((takenQty / totalQty) * 100) : 100 };
}
function avoirMoneyProgress(avoir) {
  const already = (avoir.redemptions || []).reduce((s, r) => s + r.amount, 0);
  const remaining = Math.max(0, avoir.amount - already);
  return { already, remaining, pct: avoir.amount > 0 ? Math.round((already / avoir.amount) * 100) : 100 };
}

// Modale de remise partielle/totale d'un avoir produit : le vendeur coche les
// articles que le client récupère maintenant ; les articles non cochés
// restent en avoir pour un prochain passage.
// Sélection par QUANTITÉ (pas juste ligne entière) : si un article a 2
// unités encore en avoir, le vendeur peut n'en remettre qu'une maintenant et
// laisser l'autre en avoir pour un prochain passage.
function RedeemProductAvoirModal({ avoir, onConfirm, onClose }) {
  const fmt = useFmt();
  const remainingItems = avoirRemainingItems(avoir);
  const [qtys, setQtys] = useState(() => Object.fromEntries(remainingItems.map((i) => [i.productId, i.qty])));
  const setQty = (id, max, delta) => setQtys((q) => ({ ...q, [id]: Math.max(0, Math.min(max, (q[id] || 0) + delta)) }));
  const selectedItems = remainingItems.map((i) => ({ ...i, qty: qtys[i.productId] || 0 })).filter((i) => i.qty > 0);
  const selectedValue = selectedItems.reduce((s, i) => s + i.qty * i.price, 0);
  const totalRemainingQty = remainingItems.reduce((s, i) => s + i.qty, 0);
  const totalSelectedQty = selectedItems.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="fixed inset-0 z-[85] flex items-end no-print">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full rounded-t-3xl p-6 gb-slide-up max-h-[85vh] overflow-y-auto gb-scroll" style={{ background: "var(--card)", paddingBottom: "max(28px, env(safe-area-inset-bottom))" }}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display font-bold text-lg">Remettre les produits</h2>
          <button onClick={onClose} className="gb-focus p-1"><X size={20} /></button>
        </div>
        <p className="text-xs opacity-50 mb-4">{avoir.clientName} · en avoir depuis le {new Date(avoir.date).toLocaleDateString("fr-FR")}</p>
        <p className="text-xs font-semibold opacity-60 mb-2">Combien le client récupère de chaque article maintenant</p>
        <div className="flex flex-col gap-2 mb-4">
          {remainingItems.map((it) => {
            const qty = qtys[it.productId] || 0;
            return (
              <div key={it.productId} className="w-full rounded-xl px-3.5 py-3 flex items-center gap-3 border" style={{ borderColor: qty > 0 ? "#7F77DD" : "var(--line)", background: qty > 0 ? "#EEEDFE" : "var(--card)" }}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{it.name}</div>
                  <div className="text-[11px] opacity-50">{it.qty} restant{it.qty > 1 ? "s" : ""} · {fmt(it.price)} / unité</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setQty(it.productId, it.qty, -1)} className="gb-focus w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--paper-dim)" }}><Minus size={13} /></button>
                  <span className="font-mono text-sm w-5 text-center">{qty}</span>
                  <button onClick={() => setQty(it.productId, it.qty, 1)} className="gb-focus w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--paper-dim)" }}><Plus size={13} /></button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="rounded-xl p-3 mb-4 flex items-center justify-between" style={{ background: "#EEEDFE" }}>
          <span className="text-xs font-semibold" style={{ color: "#26215C" }}>Valeur remise maintenant</span>
          <span className="font-mono font-bold text-sm" style={{ color: "#26215C" }}>{fmt(selectedValue)}</span>
        </div>
        <button onClick={() => selectedItems.length > 0 && onConfirm(selectedItems)} disabled={selectedItems.length === 0} className="gb-focus w-full rounded-2xl py-3 font-semibold text-sm text-white disabled:opacity-40" style={{ background: "#534AB7" }}>
          Valider la remise{totalSelectedQty > 0 && totalSelectedQty < totalRemainingQty ? " (partielle)" : ""}
        </button>
        <p className="text-[11px] opacity-40 text-center mt-2.5">Un reçu de remise sera généré, imprimable pour le client.</p>
      </div>
    </div>
  );
}

// Modale de remise partielle/totale d'un avoir monnaie : équivalent de
// SettleCreditModal, mais pour de la monnaie due au client.
function RedeemMoneyAvoirModal({ avoir, onConfirm, onClose }) {
  const fmt = useFmt();
  const { remaining } = avoirMoneyProgress(avoir);
  const [amount, setAmount] = useState(String(remaining));
  const [error, setError] = useState("");

  const submit = () => {
    const value = Number(amount.replace(/[^\d.]/g, ""));
    if (!value || value <= 0) { setError("Entre un montant valide"); return; }
    if (value > remaining + 0.5) { setError(`Le montant dépasse la monnaie due (${fmt(remaining)})`); return; }
    onConfirm(value);
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-end no-print">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full rounded-t-3xl p-6 gb-slide-up max-h-[85vh] overflow-y-auto gb-scroll" style={{ background: "var(--card)", paddingBottom: "max(28px, env(safe-area-inset-bottom))" }}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display font-bold text-lg">Rendre la monnaie</h2>
          <button onClick={onClose} className="gb-focus p-1"><X size={20} /></button>
        </div>
        <p className="text-xs opacity-50 mb-4">{avoir.clientName} · en avoir depuis le {new Date(avoir.date).toLocaleDateString("fr-FR")}</p>
        <div className="rounded-2xl p-3.5 mb-4 flex items-center justify-between" style={{ background: "#FAEEDA" }}>
          <div>
            <p className="text-[11px] font-semibold" style={{ color: "#854F0B" }}>Monnaie encore due</p>
            <p className="text-xl font-bold" style={{ color: "#854F0B" }}>{fmt(remaining)}</p>
          </div>
          <Coins size={24} color="#854F0B" />
        </div>
        <label className="text-xs font-semibold opacity-60 block mb-1.5">Montant rendu maintenant</label>
        <input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setError(""); }} className="gb-focus w-full rounded-xl px-3 py-3 text-lg font-bold text-center border mb-2" style={{ borderColor: error ? "var(--danger)" : "var(--line)" }} />
        {error && <p className="text-xs mb-2" style={{ color: "var(--danger)" }}>{error}</p>}
        <button onClick={() => { setAmount(String(remaining)); setError(""); }} className="gb-focus w-full rounded-xl py-2.5 text-sm font-semibold text-white mb-4" style={{ background: "#0F6E56" }}>
          Totalité ({fmt(remaining)})
        </button>
        <button onClick={submit} className="gb-focus w-full rounded-2xl py-3 font-semibold text-sm text-white flex items-center justify-center gap-2" style={{ background: "var(--glass)" }}>
          <Coins size={16} /> Rendre {amount ? fmt(Number(amount) || 0) : ""}
        </button>
        <p className="text-[11px] opacity-40 text-center mt-2.5">Un reçu de remise sera généré, imprimable pour le client.</p>
      </div>
    </div>
  );
}

// Reçu détaillé d'un avoir (soldé, ou encore partiellement en cours) : historique complet des remises (dates,
// quantités/montants, auteur) et total récupéré — scrollable comme les
// autres reçus, avec les boutons toujours visibles en bas.
// Reçu combiné pour un avoir "produit + monnaie" une fois LES DEUX soldés —
// un seul document mentionnant que la monnaie a été rendue ET que la
// totalité des produits a été récupérée, avec l'historique complet de
// chaque volet.
function CombinedAvoirReceiptModal({ produit, monnaie, shop, onClose, pushToast }) {
  const fmt = useFmt();
  const [printing, setPrinting] = useState(false);
  const notify = (msg, type) => { if (pushToast) pushToast(msg, type); };
  const productEvents = produit.history || [];
  const moneyEvents = monnaie.redemptions || [];
  const productValue = productEvents.reduce((s, e) => s + e.items.reduce((s2, i) => s2 + i.qty * i.price, 0), 0);
  const moneyValue = moneyEvents.reduce((s, e) => s + e.amount, 0);
  const totalRecovered = productValue + moneyValue;
  const settledDate = [produit.settledDate, monnaie.settledDate].filter(Boolean).sort().pop();

  const handlePrint = async () => {
    if (!isPrinterFeatureAvailable()) {
      try {
        await shareText(`Avoir — ${shop.name}`, `Avoir solde — ${shop.name}\nClient : ${produit.clientName}\nTotal recupere : ${fmt(totalRecovered)}`);
      } catch (e) {
        notify(e.message || "Impossible de partager le reçu.", "error");
      }
      return;
    }
    setPrinting(true);
    try {
      await printCombinedAvoirReceipt(produit, monnaie, shop, fmt);
    } catch (e) {
      notify(e.message || "Impossible d'imprimer — vérifiez que RawBT est installé et configuré.", "error");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-6 no-print">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-xs bg-white rounded-t-2xl gb-pop flex flex-col overflow-hidden" style={{ maxHeight: "88vh" }}>
        <div id="receipt-print-area" className="overflow-y-auto gb-scroll ticket-edge px-5 pt-5" style={{ paddingBottom: 24 }}>
          <div className="text-center">
            <div className="w-11 h-11 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ background: "#EAF3DE" }}>
              <Check size={20} color="#27500A" strokeWidth={2.6} />
            </div>
            <p className="font-display font-bold text-[13px] tracking-[0.16em] uppercase" style={{ color: "#27500A" }}>Avoir soldé</p>
            <p className="text-[11px] opacity-50 mt-0.5">Produits et monnaie intégralement remis</p>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono opacity-45 mt-3">
            <span>N° {receiptNumber(produit.id)}</span>
            <span>Soldé le {settledDate ? new Date(settledDate).toLocaleDateString("fr-FR") : ""}</span>
          </div>
          <div className="flex justify-between text-[11px] mt-1.5"><span className="opacity-50">Client</span><span className="font-semibold">{produit.clientName}</span></div>
          <div className="flex justify-between text-[11px] mt-1"><span className="opacity-50">Avoir créé le</span><span>{new Date(produit.date).toLocaleDateString("fr-FR")} par {produit.vendor}</span></div>

          <div className="border-t border-dashed my-3" style={{ borderColor: "var(--line)" }} />

          <div className="rounded-xl overflow-hidden mb-3" style={{ border: "1px solid #D8DFD4" }}>
            <div className="px-3 py-2 flex items-center justify-between" style={{ background: "#EEEDFE" }}>
              <span className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5" style={{ color: "#534AB7" }}><PackageX size={12} /> Produits</span>
              <span className="text-[10px] font-bold flex items-center gap-1" style={{ color: "#27500A" }}><Check size={11} /> Tous reçus</span>
            </div>
            <div className="p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-45 mb-1.5">Articles d'origine</p>
              <div className="flex flex-col gap-1 mb-3">
                {produit.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span>{it.qty} × {it.name}</span>
                    <span className="font-mono opacity-60">{fmt(it.qty * it.price)}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-45 mb-1.5">Retraits</p>
              <div className="flex flex-col gap-1.5">
                {productEvents.map((e, idx) => (
                  <div key={idx} className="rounded-lg p-2" style={{ background: "var(--paper-dim)" }}>
                    <div className="flex justify-between text-[9px] font-mono opacity-50 mb-1">
                      <span>{new Date(e.date).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      <span>{e.by}</span>
                    </div>
                    {e.items.map((it, i) => (
                      <div key={i} className="flex justify-between text-[11px]">
                        <span>{it.qty} × {it.name}</span>
                        <span className="font-mono">{fmt(it.qty * it.price)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden mb-1" style={{ border: "1px solid #D8DFD4" }}>
            <div className="px-3 py-2 flex items-center justify-between" style={{ background: "#FAEEDA" }}>
              <span className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5" style={{ color: "#854F0B" }}><Coins size={12} /> Monnaie</span>
              <span className="text-[10px] font-bold flex items-center gap-1" style={{ color: "#27500A" }}><Check size={11} /> Rendue</span>
            </div>
            <div className="p-3">
              <div className="flex justify-between text-sm font-semibold mb-3"><span>Monnaie due</span><span className="font-mono">{fmt(monnaie.amount)}</span></div>
              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-45 mb-1.5">Remises</p>
              <div className="flex flex-col gap-1.5">
                {moneyEvents.map((e, idx) => (
                  <div key={idx} className="rounded-lg p-2 flex justify-between text-[11px] font-semibold" style={{ background: "var(--paper-dim)" }}>
                    <span className="opacity-60 font-normal">{new Date(e.date).toLocaleDateString("fr-FR")} · {e.by}</span>
                    <span className="font-mono">{fmt(e.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-dashed my-3" style={{ borderColor: "var(--line)" }} />

          <div className="flex justify-between items-baseline">
            <span className="text-[11px] font-semibold uppercase tracking-wide opacity-50">Total récupéré</span>
            <span className="font-display font-bold text-2xl" style={{ color: "#27500A" }}>{fmt(totalRecovered)}</span>
          </div>

          <div className="border-t border-dashed my-3" style={{ borderColor: "var(--line)" }} />

          <ReceiptCodes id={produit.id} label={`N° ${receiptNumber(produit.id)}`} />

          <div className="text-center">
            <p className="font-display font-bold text-[15px]" style={{ color: "var(--glass)" }}>{shop.name}</p>
            <p className="text-[11px] italic opacity-55 mt-1.5 leading-snug">Merci pour votre confiance.<br />À très bientôt !</p>
          </div>
        </div>
        <div className="px-5 pt-3" style={{ borderTop: "1px solid var(--line)", paddingBottom: "max(18px, env(safe-area-inset-bottom))" }}>
          <div className="flex gap-2">
            <button onClick={onClose} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--paper-dim)" }}>Fermer</button>
            <button onClick={handlePrint} disabled={printing} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-1.5 disabled:opacity-60" style={{ background: "var(--glass)" }}>
              <Printer size={14} /> {printing ? "Impression…" : "Imprimer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


function AvoirReceiptModal({ avoir, shop, onClose, pushToast }) {
  const fmt = useFmt();
  const [printing, setPrinting] = useState(false);
  const notify = (msg, type) => { if (pushToast) pushToast(msg, type); };
  const isProduit = avoir.type === "produit";
  const events = isProduit ? (avoir.history || []) : (avoir.redemptions || []);
  const totalRecovered = isProduit
    ? events.reduce((s, e) => s + e.items.reduce((s2, i) => s2 + i.qty * i.price, 0), 0)
    : events.reduce((s, e) => s + e.amount, 0);
  const remaining = isProduit ? avoirProductProgress(avoir).remainingQty : avoirMoneyProgress(avoir).remaining;
  const title = avoir.settled
    ? (isProduit ? "Avoir produit soldé" : "Avoir monnaie soldé")
    : (isProduit ? "Remise partielle — avoir produit" : "Remise partielle — avoir monnaie");

  const handlePrint = async () => {
    if (!isPrinterFeatureAvailable()) {
      try {
        await shareText(`Avoir — ${shop.name}`, `${title} — ${shop.name}\nClient : ${avoir.clientName}\nTotal recupere : ${fmt(totalRecovered)}`);
      } catch (e) {
        notify(e.message || "Impossible de partager le reçu.", "error");
      }
      return;
    }
    setPrinting(true);
    try {
      await printAvoirReceipt(avoir, shop, fmt);
    } catch (e) {
      notify(e.message || "Impossible d'imprimer — vérifiez que RawBT est installé et configuré.", "error");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-6 no-print">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-xs bg-white rounded-t-2xl gb-pop flex flex-col overflow-hidden" style={{ maxHeight: "85vh" }}>
        <div id="receipt-print-area" className="overflow-y-auto gb-scroll ticket-edge px-5 pt-5" style={{ paddingBottom: 24 }}>
          <div className="text-center">
            <Check size={18} className="mx-auto mb-1.5" style={{ color: "#0F6E56" }} />
            <p className="font-display font-bold text-[12px] tracking-[0.18em] uppercase" style={{ color: "#0F6E56" }}>{title}</p>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono opacity-45 mt-3">
            <span>N° {receiptNumber(avoir.id)}</span>
            <span>{avoir.settled ? `Soldé le ${avoir.settledDate ? new Date(avoir.settledDate).toLocaleDateString("fr-FR") : ""}` : `Édité le ${new Date().toLocaleDateString("fr-FR")}`}</span>
          </div>
          <div className="flex justify-between text-[11px] mt-1.5"><span className="opacity-50">Client</span><span className="font-semibold">{avoir.clientName}</span></div>
          <div className="flex justify-between text-[11px] mt-1"><span className="opacity-50">Avoir créé le</span><span>{new Date(avoir.date).toLocaleDateString("fr-FR")} par {avoir.vendor}</span></div>

          <div className="border-t border-dashed my-3" style={{ borderColor: "var(--line)" }} />

          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-50 mb-2">{isProduit ? "Articles d'origine" : "Montant d'origine"}</p>
          {isProduit ? (
            <div className="flex flex-col gap-1.5 mb-1">
              {avoir.items.map((it, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span>{it.qty} × {it.name}</span>
                  <span className="font-mono opacity-60">{fmt(it.qty * it.price)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex justify-between text-sm font-semibold"><span>Monnaie due</span><span className="font-mono">{fmt(avoir.amount)}</span></div>
          )}

          <div className="border-t border-dashed my-3" style={{ borderColor: "var(--line)" }} />

          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-50 mb-2">Historique des remises</p>
          <div className="flex flex-col gap-2.5">
            {events.map((e, idx) => (
              <div key={idx} className="rounded-xl p-2.5" style={{ background: "var(--paper-dim)" }}>
                <div className="flex justify-between text-[10px] font-mono opacity-50 mb-1">
                  <span>{new Date(e.date).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  <span>{e.by}</span>
                </div>
                {isProduit ? (
                  e.items.map((it, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span>{it.qty} × {it.name}</span>
                      <span className="font-mono">{fmt(it.qty * it.price)}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Monnaie rendue</span>
                    <span className="font-mono">{fmt(e.amount)}</span>
                  </div>
                )}
              </div>
            ))}
            {events.length === 0 && <p className="text-xs opacity-50">Aucune remise enregistrée.</p>}
          </div>

          <div className="border-t border-dashed my-3" style={{ borderColor: "var(--line)" }} />

          <div className="flex justify-between items-baseline">
            <span className="text-[11px] font-semibold uppercase tracking-wide opacity-50">Total récupéré</span>
            <span className="font-display font-bold text-2xl" style={{ color: "#0F6E56" }}>{fmt(totalRecovered)}</span>
          </div>
          {!avoir.settled && remaining > 0 && (
            <div className="rounded-xl p-3 mt-3" style={{ background: isProduit ? "#EEEDFE" : "#FAEEDA" }}>
              <p className="text-[12px] font-bold" style={{ color: isProduit ? "#26215C" : "#854F0B" }}>
                {isProduit ? `Encore en avoir : ${remaining} article${remaining > 1 ? "s" : ""}` : `Encore en avoir : ${fmt(remaining)}`}
              </p>
            </div>
          )}

          <div className="border-t border-dashed my-3" style={{ borderColor: "var(--line)" }} />

          <ReceiptCodes id={avoir.id} label={`N° ${receiptNumber(avoir.id)}`} />

          <div className="text-center">
            <p className="font-display font-bold text-[15px]" style={{ color: "var(--glass)" }}>{shop.name}</p>
            <p className="text-[11px] italic opacity-55 mt-1.5 leading-snug">Merci pour votre confiance.<br />À très bientôt !</p>
          </div>
        </div>
        <div className="px-5 pt-3" style={{ borderTop: "1px solid var(--line)", paddingBottom: "max(18px, env(safe-area-inset-bottom))" }}>
          <div className="flex gap-2">
            <button onClick={onClose} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--paper-dim)" }}>Fermer</button>
            <button onClick={handlePrint} disabled={printing} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-1.5 disabled:opacity-60" style={{ background: "var(--glass)" }}>
              <Printer size={14} /> {printing ? "Impression…" : "Imprimer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AvoirsScreen({ shop, avoirs, onRedeemMoney, onRedeemProduct, pushToast }) {
  const fmt = useFmt();
  const [periodFilter, setPeriodFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [redeemProduct, setRedeemProduct] = useState(null);
  const [redeemMoney, setRedeemMoney] = useState(null);
  const [viewingReceipt, setViewingReceipt] = useState(null);
  const [viewingCombinedReceipt, setViewingCombinedReceipt] = useState(null);

  const periodAvoirs = avoirs.filter((a) => inPeriod(a.date, periodFilter, customFrom, customTo));

  // Regroupement : un avoir produit et un avoir monnaie créés ensemble
  // (moneyAvoir.saleId === productAvoir.id) restent affichés comme UNE
  // seule carte tant que l'un des deux n'est pas soldé — même quand l'un
  // des deux est déjà réglé, il reste visible (avec un badge "reçu") à côté
  // de l'autre encore en cours. La paire ne bascule dans "Récemment soldés"
  // que lorsque LES DEUX sont soldés.
  const items = [];
  const consumed = new Set();
  periodAvoirs.forEach((a) => {
    if (consumed.has(a.id)) return;
    if (a.type === "produit") {
      const linkedMoney = periodAvoirs.find((m) => m.type === "monnaie" && m.saleId === a.id);
      if (linkedMoney) {
        consumed.add(a.id); consumed.add(linkedMoney.id);
        items.push({ combined: true, id: a.id, produit: a, monnaie: linkedMoney, date: a.date, clientName: a.clientName, bothSettled: a.settled && linkedMoney.settled });
        return;
      }
    }
    items.push({ combined: false, id: a.id, avoir: a, bothSettled: a.settled });
  });

  const outstandingItems = items.filter((it) => !it.bothSettled).sort((x, y) => new Date(y.date) - new Date(x.date));
  const settledLatestDate = (it) => it.combined
    ? Math.max(new Date(it.produit.settledDate || it.produit.date).getTime(), new Date(it.monnaie.settledDate || it.monnaie.date).getTime())
    : new Date(it.avoir.settledDate || it.avoir.date).getTime();
  const settledItems = items.filter((it) => it.bothSettled).sort((x, y) => settledLatestDate(y) - settledLatestDate(x));

  // Valeur totale restante en avoir sur la période, tous types confondus
  // (monnaie non rendue + valeur des produits pas encore remis) — un seul
  // chiffre parlant pour le bloc "Total en avoir".
  const totalValue = outstandingItems.reduce((s, it) => {
    if (it.combined) {
      const pVal = it.produit.settled ? 0 : avoirRemainingItems(it.produit).reduce((s2, i) => s2 + i.qty * i.price, 0);
      const mVal = it.monnaie.settled ? 0 : avoirMoneyProgress(it.monnaie).remaining;
      return s + pVal + mVal;
    }
    const a = it.avoir;
    return s + (a.type === "produit" ? avoirRemainingItems(a).reduce((s2, i) => s2 + i.qty * i.price, 0) : avoirMoneyProgress(a).remaining);
  }, 0);

  return (
    <div className="px-4 pt-4 pb-28">
      <h2 className="font-display font-bold text-lg mb-3">Avoirs</h2>

      <PeriodFilterBar value={periodFilter} onChange={setPeriodFilter} customFrom={customFrom} customTo={customTo} onCustomFrom={setCustomFrom} onCustomTo={setCustomTo} />

      <div className="grid grid-cols-2 gap-2.5 mb-5">
        <StatCard icon={PackageX} label="Avoirs en cours" value={outstandingItems.length} dark />
        <StatCard icon={Coins} label="Total en avoir" value={fmt(totalValue)} tintBg="#FAEEDA" tintFg="#854F0B" />
      </div>

      {outstandingItems.length === 0 && <p className="text-sm opacity-50 text-center py-6">Aucun avoir en cours sur cette période.</p>}
      <div className="flex flex-col gap-2.5 mb-6">
        {outstandingItems.map((it) => {
          if (!it.combined) {
            const a = it.avoir;
            const isProduit = a.type === "produit";
            const isOpen = expanded === a.id;
            const prog = isProduit ? avoirProductProgress(a) : avoirMoneyProgress(a);
            const hasPartial = isProduit ? prog.takenQty > 0 : prog.already > 0;
            return (
              <div key={a.id} className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", boxShadow: "0 2px 10px rgba(15,27,22,0.07)" }}>
                <button onClick={() => setExpanded(isOpen ? null : a.id)} className="gb-focus w-full p-3.5 flex items-center gap-3 text-left">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px]" style={{ background: isProduit ? "#EEEDFE" : "#FAEEDA", color: isProduit ? "#534AB7" : "#854F0B" }}>{initials(a.clientName)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{a.clientName}</div>
                    <div className="text-[11px] opacity-60">{isProduit ? `Avoir produit · ${prog.remainingQty}/${prog.totalQty} article${prog.totalQty > 1 ? "s" : ""} restants` : "Monnaie non rendue"} · {new Date(a.date).toLocaleDateString("fr-FR")}</div>
                  </div>
                  {!isProduit && <span className="font-mono font-bold text-sm shrink-0" style={{ color: "#854F0B" }}>{fmt(prog.remaining)}</span>}
                  <ChevronDown size={14} className="shrink-0" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                </button>

                {hasPartial && (
                  <div className="px-3.5 pt-2.5 pb-3.5">
                    <div className="flex justify-between text-[11px] opacity-50 mb-1.5">
                      <span>{isProduit ? `${prog.takenQty} déjà remis` : `${fmt(prog.already)} déjà rendus`}</span>
                      <span>sur {isProduit ? prog.totalQty : fmt(a.amount)}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--paper-dim)" }}>
                      <div className="h-full rounded-full" style={{ width: `${prog.pct}%`, background: isProduit ? "#7F77DD" : "#185FA5" }} />
                    </div>
                  </div>
                )}

                {isOpen && (
                  <div className="px-3.5 py-2.5" style={{ background: "var(--paper-dim)" }}>
                    {isProduit ? (
                      avoirRemainingItems(a).map((i2, i) => (
                        <div key={i} className="flex items-center justify-between text-xs py-1">
                          <span>{i2.qty} x {i2.name}</span>
                          <span className="opacity-50 font-mono">{fmt(i2.qty * i2.price)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-between text-xs py-1">
                        <span>Monnaie encore due</span>
                        <span className="opacity-50 font-mono">{fmt(prog.remaining)}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-2.5 pt-0">
                  <button onClick={() => (isProduit ? setRedeemProduct(a) : setRedeemMoney(a))} className="gb-focus w-full rounded-xl py-2.5 text-xs font-semibold text-white" style={{ background: "#0F6E56" }}>
                    Marquer comme reçu
                  </button>
                </div>
              </div>
            );
          }

          // Carte combinée : avoir produit + avoir monnaie issus de la même
          // vente — un seul client, deux sections indépendantes. Une section
          // déjà réglée affiche un badge "reçu" à la place du bouton, sans
          // faire quitter la carte des avoirs en cours tant que l'autre
          // section n'est pas, elle aussi, réglée.
          const { produit, monnaie } = it;
          const pProg = avoirProductProgress(produit);
          const mProg = avoirMoneyProgress(monnaie);
          const isOpen = expanded === it.id;
          return (
            <div key={it.id} className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", boxShadow: "0 2px 10px rgba(15,27,22,0.07)" }}>
              <button onClick={() => setExpanded(isOpen ? null : it.id)} className="gb-focus w-full p-3.5 flex items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px]" style={{ background: "#FAEEDA", color: "#854F0B" }}>{initials(it.clientName)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{it.clientName}</div>
                  <div className="text-[11px] opacity-60">Avoir produit + monnaie · {new Date(it.date).toLocaleDateString("fr-FR")}</div>
                </div>
                <ChevronDown size={14} className="shrink-0" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
              </button>

              {isOpen && !produit.settled && (
                <div className="px-3.5 py-2.5" style={{ background: "var(--paper-dim)" }}>
                  {avoirRemainingItems(produit).map((i2, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1">
                      <span>{i2.qty} x {i2.name}</span>
                      <span className="opacity-50 font-mono">{fmt(i2.qty * i2.price)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mx-3.5 mb-3 rounded-xl overflow-hidden" style={{ border: "1px solid var(--line)" }}>
                <div className="px-3 py-2.5 flex items-center justify-between" style={{ background: "#EEEDFE" }}>
                  <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#534AB7" }}><PackageX size={13} /> Produits{!produit.settled ? ` — ${pProg.remainingQty}/${pProg.totalQty} restants` : ""}</span>
                </div>
                {produit.settled ? (
                  <div className="p-2.5 flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#27500A" }}><Check size={14} /> Produits reçus</div>
                ) : (
                  <>
                    {pProg.takenQty > 0 && (
                      <div className="px-3 pt-2">
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--paper-dim)" }}>
                          <div className="h-full rounded-full" style={{ width: `${pProg.pct}%`, background: "#7F77DD" }} />
                        </div>
                      </div>
                    )}
                    <div className="p-2.5">
                      <button onClick={() => setRedeemProduct(produit)} className="gb-focus w-full rounded-lg py-2 text-xs font-semibold text-white" style={{ background: "#534AB7" }}>Marquer les produits comme reçus</button>
                    </div>
                  </>
                )}
              </div>

              <div className="mx-3.5 mb-3.5 rounded-xl overflow-hidden" style={{ border: "1px solid var(--line)" }}>
                <div className="px-3 py-2.5 flex items-center justify-between" style={{ background: "#FAEEDA" }}>
                  <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#854F0B" }}><Coins size={13} /> Monnaie{!monnaie.settled ? ` — ${fmt(mProg.remaining)} due` : ""}</span>
                </div>
                {monnaie.settled ? (
                  <div className="p-2.5 flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#27500A" }}><Check size={14} /> Monnaie rendue</div>
                ) : (
                  <>
                    {mProg.already > 0 && (
                      <div className="px-3 pt-2">
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--paper-dim)" }}>
                          <div className="h-full rounded-full" style={{ width: `${mProg.pct}%`, background: "#185FA5" }} />
                        </div>
                      </div>
                    )}
                    <div className="p-2.5">
                      <button onClick={() => setRedeemMoney(monnaie)} className="gb-focus w-full rounded-lg py-2 text-xs font-semibold text-white" style={{ background: "#0F6E56" }}>Rendre la monnaie</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {settledItems.length > 0 && (
        <>
          <h3 className="font-display font-bold text-base mb-2">Récemment soldés</h3>
          <div className="flex flex-col gap-2">
            {settledItems.slice(0, 10).map((it) => {
              if (!it.combined) {
                const a = it.avoir;
                return (
                  <button key={a.id} onClick={() => setViewingReceipt(a)} className="gb-focus w-full rounded-xl p-3 flex items-center gap-3 text-left" style={{ background: "var(--card)", boxShadow: "0 2px 8px rgba(15,27,22,0.06)" }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px]" style={{ background: "#EAF3DE", color: "#27500A" }}>{initials(a.clientName)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{a.clientName}</div>
                      <div className="text-[11px] opacity-50">{a.type === "produit" ? "Avoir produit" : "Monnaie"} · {a.settledDate ? new Date(a.settledDate).toLocaleDateString("fr-FR") : ""}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="font-mono text-sm font-semibold opacity-60">{a.type === "produit" ? `${a.items.length} art.` : fmt(a.amount)}</span>
                      <ChevronDown size={13} className="opacity-40" style={{ transform: "rotate(-90deg)" }} />
                    </div>
                  </button>
                );
              }
              const { produit, monnaie } = it;
              return (
                <button key={it.id} onClick={() => setViewingCombinedReceipt({ produit, monnaie })} className="gb-focus w-full rounded-xl p-3 flex items-center gap-3 text-left" style={{ background: "var(--card)", boxShadow: "0 2px 8px rgba(15,27,22,0.06)" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px]" style={{ background: "#EAF3DE", color: "#27500A" }}>{initials(it.clientName)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{it.clientName}</div>
                    <div className="text-[11px] opacity-50">Avoir produit + monnaie soldé</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="font-mono text-sm font-semibold opacity-60">{fmt(monnaie.amount)}</span>
                    <ChevronDown size={13} className="opacity-40" style={{ transform: "rotate(-90deg)" }} />
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {redeemProduct && (
        <RedeemProductAvoirModal
          avoir={redeemProduct}
          onClose={() => setRedeemProduct(null)}
          onConfirm={(items2) => {
            const updated = onRedeemProduct(redeemProduct.id, items2);
            setRedeemProduct(null);
            if (updated) setViewingReceipt(updated);
          }}
        />
      )}
      {redeemMoney && (
        <RedeemMoneyAvoirModal
          avoir={redeemMoney}
          onClose={() => setRedeemMoney(null)}
          onConfirm={(amount) => {
            const updated = onRedeemMoney(redeemMoney.id, amount);
            setRedeemMoney(null);
            if (updated) setViewingReceipt(updated);
          }}
        />
      )}
      {viewingReceipt && <AvoirReceiptModal avoir={viewingReceipt} shop={shop} onClose={() => setViewingReceipt(null)} pushToast={pushToast} />}
      {viewingCombinedReceipt && <CombinedAvoirReceiptModal produit={viewingCombinedReceipt.produit} monnaie={viewingCombinedReceipt.monnaie} shop={shop} onClose={() => setViewingCombinedReceipt(null)} pushToast={pushToast} />}
    </div>
  );
}

// Recherche d'un reçu déjà remis au client (scanné ou saisi manuellement) —
// indique s'il reste un avoir ou un crédit en cours sur ce reçu, avec accès
// au reçu détaillé correspondant.
// Fenêtre "fond de caisse du jour" — un seul montant par jour civil, partagé
// par toute la boutique (peu importe qui le saisit). S'ouvre automatiquement
// au centre à l'entrée sur Vendre tant qu'il manque, et se redéclenche si on
// tente une vente sans l'avoir renseigné.
function CashRegisterModal({ onSave, onClose, afterVersement }) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const submit = () => {
    if (amount === "" || isNaN(Number(amount)) || Number(amount) < 0) {
      setError("Indiquez un montant valide (0 ou plus).");
      return;
    }
    onSave(amount);
  };
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center px-6 no-print">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-xs bg-white rounded-2xl overflow-hidden gb-pop">
        <div className="px-4 py-3.5 flex items-center justify-between" style={{ background: "var(--glass)" }}>
          <div className="flex items-center gap-2">
            <Banknote size={18} color="var(--cap)" />
            <span className="text-sm font-bold text-white">{afterVersement ? "Montant restant en caisse" : "Fond de caisse"}</span>
          </div>
          <button onClick={onClose} className="gb-focus" aria-label="Fermer"><X size={18} color="rgba(255,255,255,0.7)" /></button>
        </div>
        <div className="p-4">
          <p className="text-xs opacity-60 mb-3.5 leading-relaxed">{afterVersement ? "Le versement est enregistré. Indique le montant en espèces qui reste dans la caisse : il devient le fond de la nouvelle caisse." : "Indique le montant en espèces présent dans la caisse. Il reste valable jusqu'au prochain versement."}</p>
          <label className="text-[11px] font-bold opacity-60 block mb-1.5">Montant (FCFA)</label>
          <input
            type="number" min="0" inputMode="numeric" autoFocus
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="gb-focus w-full rounded-xl px-3 py-2.5 text-lg font-bold border-2 mb-1"
            style={{ borderColor: "var(--cap)" }}
            placeholder="0"
          />
          {error && <p className="text-[11px] mb-3" style={{ color: "var(--danger)" }}>{error}</p>}
          <button onClick={submit} className={`gb-focus w-full rounded-xl py-3 text-sm font-bold text-white ${error ? "" : "mt-3"}`} style={{ background: "var(--glass)" }}>Enregistrer le fond de caisse</button>
        </div>
      </div>
    </div>
  );
}

function ScanReceiptModal({ sales, avoirs, shop, clients, onClose, pushToast, onReturnSale }) {
  const fmt = useFmt();
  const [returning, setReturning] = useState(null);
  const [code, setCode] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [viewSale, setViewSale] = useState(null);
  const [viewAvoir, setViewAvoir] = useState(null);

  const search = (raw) => {
    const digits = String(raw || "").replace(/\D/g, "");
    if (!digits) return;
    const sale = sales.find((s) => receiptNumber(s.id) === digits);
    if (sale) {
      setResult({ kind: "sale", entry: sale });
      setNotFound(false);
      if (sale.paymentMethod === "credit") {
        const remaining = Math.max(0, sale.total - creditPaidSoFar(sale));
        if (remaining > 0) speak(`${sale.clientName || "Le client"} a un reste à payer de ${spokenAmount(fmt(remaining))}.`, voiceOn(shop, "credit"));
      }
      return;
    }
    const avoir = avoirs.find((a) => receiptNumber(a.id) === digits);
    if (avoir) {
      setResult({ kind: "avoir", entry: avoir });
      setNotFound(false);
      if (!avoir.settled) {
        const prog = avoir.type === "produit" ? avoirProductProgress(avoir) : avoirMoneyProgress(avoir);
        const msg = avoir.type === "produit"
          ? `${avoir.clientName || "Le client"} a encore ${prog.remainingQty} article${prog.remainingQty > 1 ? "s" : ""} en avoir.`
          : `${avoir.clientName || "Le client"} a encore ${spokenAmount(fmt(prog.remaining))} en avoir.`;
        speak(msg, voiceOn(shop, "credit"));
      }
      return;
    }
    setResult(null);
    setNotFound(true);
  };

  const handleDetect = (value) => { setScannerOpen(false); setCode(value.replace(/\D/g, "")); search(value); };

  return (
    <div className="fixed inset-0 z-[92] flex items-end no-print">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full rounded-t-3xl p-6 gb-slide-up max-h-[85vh] overflow-y-auto gb-scroll" style={{ background: "var(--card)", paddingBottom: "max(28px, env(safe-area-inset-bottom))" }}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display font-bold text-lg">Scanner un reçu</h2>
          <button onClick={onClose} className="gb-focus p-1"><X size={20} /></button>
        </div>
        <p className="text-xs opacity-50 mb-4">Scanne le code-barres ou saisis le numéro pour vérifier s'il reste un avoir ou un crédit en cours.</p>

        <div className="flex items-center gap-2 mb-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && search(code)}
            placeholder="Numéro du reçu"
            inputMode="numeric"
            className="gb-focus flex-1 rounded-xl px-3 py-3 text-sm border font-mono"
            style={{ borderColor: "var(--line)" }}
          />
          <button onClick={() => setScannerOpen(true)} className="gb-focus w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--glass)" }} aria-label="Scanner le code-barres">
            <Barcode size={18} color="#fff" />
          </button>
        </div>
        <button onClick={() => search(code)} className="gb-focus w-full rounded-xl py-2.5 text-sm font-semibold text-white mb-4" style={{ background: "#0F6E56" }}>Rechercher</button>

        {notFound && <p className="text-sm text-center opacity-50 py-4">Aucun reçu ne correspond à ce numéro.</p>}

        {result?.kind === "sale" && (() => {
          const s = result.entry;
          const isCredit = s.paymentMethod === "credit";
          const paidSoFar = isCredit ? creditPaidSoFar(s) : s.total;
          const remaining = isCredit ? Math.max(0, s.total - paidSoFar) : 0;
          return (
            <div className="rounded-2xl p-4 gb-slide-up" style={{ background: isCredit && remaining > 0 ? "#FCEBEB" : "#EAF3DE" }}>
              <p className="text-xs font-semibold opacity-60 mb-1">Vente · {new Date(s.date).toLocaleDateString("fr-FR")}</p>
              <p className="text-sm font-bold mb-2">{s.clientName || "Client"} — {fmt(s.total)}</p>
              {isCredit ? (
                remaining > 0 ? (
                  <p className="text-sm font-semibold" style={{ color: "var(--danger)" }}>Crédit en cours — reste {fmt(remaining)}</p>
                ) : (
                  <p className="text-sm font-semibold" style={{ color: "#27500A" }}>Crédit soldé</p>
                )
              ) : (
                <p className="text-sm" style={{ color: "#27500A" }}>Vente encaissée — {PAYMENT_LABELS[s.paymentMethod]}</p>
              )}
              <button onClick={() => setViewSale(s)} className="gb-focus w-full rounded-xl py-2 text-xs font-semibold text-white mt-3" style={{ background: "var(--glass)" }}>Voir le reçu</button>
              {onReturnSale && s.items?.length > 0 && <button onClick={() => setReturning(s)} className="gb-focus w-full rounded-xl py-2 text-xs font-bold mt-2 flex items-center justify-center gap-1.5" style={{ background: "#fff", color: "#0F6E56" }}><Undo2 size={13} /> Faire un retour</button>}
            </div>
          );
        })()}

        {result?.kind === "avoir" && (() => {
          const a = result.entry;
          const isProduit = a.type === "produit";
          const prog = isProduit ? avoirProductProgress(a) : avoirMoneyProgress(a);
          return (
            <div className="rounded-2xl p-4 gb-slide-up" style={{ background: a.settled ? "#EAF3DE" : (isProduit ? "#EEEDFE" : "#FAEEDA") }}>
              <p className="text-xs font-semibold opacity-60 mb-1">{isProduit ? "Avoir produit" : "Avoir monnaie"} · {new Date(a.date).toLocaleDateString("fr-FR")}</p>
              <p className="text-sm font-bold mb-2">{a.clientName}</p>
              {a.settled ? (
                <p className="text-sm font-semibold" style={{ color: "#27500A" }}>Avoir soldé</p>
              ) : (
                <p className="text-sm font-semibold" style={{ color: isProduit ? "#26215C" : "#854F0B" }}>
                  {isProduit ? `Encore en avoir : ${prog.remainingQty} article${prog.remainingQty > 1 ? "s" : ""}` : `Encore en avoir : ${fmt(prog.remaining)}`}
                </p>
              )}
              <button onClick={() => setViewAvoir(a)} className="gb-focus w-full rounded-xl py-2 text-xs font-semibold text-white mt-3" style={{ background: "var(--glass)" }}>Voir le reçu</button>
            </div>
          );
        })()}
      </div>

      {scannerOpen && <CameraScanner onDetect={handleDetect} onClose={() => setScannerOpen(false)} />}
      {viewSale && <SaleReceiptModal receipt={viewSale} shop={shop} clients={clients || []} onClose={() => setViewSale(null)} pushToast={pushToast} />}
      {viewAvoir && <AvoirReceiptModal avoir={viewAvoir} shop={shop} onClose={() => setViewAvoir(null)} pushToast={pushToast} />}
      {returning && <SaleReturnFlow sale={returning} shop={shop} onReturnSale={onReturnSale} onClose={() => { setReturning(null); setResult(null); }} pushToast={pushToast} />}
    </div>
  );
}

// Regroupe Crédits et Avoirs sous un seul onglet de navigation, avec un
// sous-menu à l'intérieur — évite de surcharger la barre du bas.
function PositionScreen({ shop, sales, avoirs, clients, onSettleCredit, onRedeemMoney, onRedeemProduct, onReturnSale, pushToast }) {
  const [sub, setSub] = useState("credit");
  const [scanOpen, setScanOpen] = useState(false);
  return (
    <div>
      <div className="px-4 pt-4 flex gap-2">
        <button onClick={() => setSub("credit")} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: sub === "credit" ? "var(--glass)" : "var(--paper-dim)", color: sub === "credit" ? "#fff" : "var(--ink)" }}>Crédit</button>
        <button onClick={() => setSub("avoir")} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: sub === "avoir" ? "var(--glass)" : "var(--paper-dim)", color: sub === "avoir" ? "#fff" : "var(--ink)" }}>Avoir</button>
        <button onClick={() => setScanOpen(true)} className="gb-focus w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--cap)" }} aria-label="Scanner un reçu">
          <Barcode size={20} color="var(--glass)" strokeWidth={2.2} />
        </button>
      </div>
      {sub === "credit" ? (
        <CreditsScreen shop={shop} sales={sales} onSettle={onSettleCredit} pushToast={pushToast} />
      ) : (
        <AvoirsScreen shop={shop} avoirs={avoirs} onRedeemMoney={onRedeemMoney} onRedeemProduct={onRedeemProduct} pushToast={pushToast} />
      )}
      {scanOpen && <ScanReceiptModal sales={sales} avoirs={avoirs} shop={shop} clients={clients} onClose={() => setScanOpen(false)} pushToast={pushToast} onReturnSale={onReturnSale} />}
    </div>
  );
}

/* ---------- Formulaires admin ---------- */

function ProductForm({ initial, categories, products, onSave, onCancel, pushToast }) {
  const symbol = useCurrencySymbol();
  const [f, setF] = useState(initial || { name: "", barcode: "", category: categories[0]?.id || "", costPrice: "", price: "", stock: "", minStock: 5, unit: "bouteille", bulkQty: "", bulkPrice: "", favorite: false, image: null });
  const [bulkEnabled, setBulkEnabled] = useState(!!(initial && initial.bulkQty > 0));
  const [scannerOpen, setScannerOpen] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const margin = Number(f.price) - Number(f.costPrice);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  // Les photos brutes d'un téléphone peuvent peser plusieurs Mo, alors que le
  // stockage local limite chaque clé à 5 Mo — et TOUS les produits d'une
  // boutique partagent la même clé. Une seule photo non compressée suffisait
  // à faire échouer la sauvegarde de tout le catalogue ("Erreur de
  // sauvegarde"). On redimensionne et compresse systématiquement avant
  // d'enregistrer, ce qui fait passer une photo de plusieurs Mo à quelques
  // dizaines de Ko, largement suffisant pour une vignette produit.
  const compressImage = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const maxDim = 480;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.65));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      set("image", compressed);
    } catch {
      pushToast?.("Impossible de traiter cette photo", "error");
    }
  };
  return (
    <div className="rounded-2xl border p-4 mb-3 gb-slide-up" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
      {scannerOpen && (
        <CameraScanner
          onDetect={(code) => { set("barcode", code); setScannerOpen(false); pushToast?.("Code-barre scanné", "ok"); }}
          onClose={() => setScannerOpen(false)}
        />
      )}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageFile} />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
      <div className="flex items-center gap-3 mb-4">
        <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center" style={{ background: `${getCategory(categories, f.category).color}1f` }}>
          {f.image ? <img src={f.image} alt="" className="w-full h-full object-cover" /> : <CategoryIcon cat={f.category} categories={categories} size={24} />}
        </div>
        <div className="flex-1 flex gap-2">
          <button onClick={() => cameraInputRef.current?.click()} className="gb-focus flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold border" style={{ borderColor: "var(--line)" }}><Camera size={13} /> Photo</button>
          <button onClick={() => galleryInputRef.current?.click()} className="gb-focus flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold border" style={{ borderColor: "var(--line)" }}><Layers size={13} /> Galerie</button>
          {f.image && <button onClick={() => set("image", null)} className="gb-focus w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#FCEBEB" }} aria-label="Retirer la photo"><Trash2 size={13} color="var(--danger)" /></button>}
        </div>
      </div>

      <label className="text-[11px] font-semibold opacity-60 block mb-1">Nom du produit</label>
      <input className="gb-focus w-full rounded-xl px-3 py-2 text-sm border mb-3" style={{ borderColor: "var(--line)" }} placeholder="Nom du produit" value={f.name} onChange={(e) => set("name", e.target.value)} />

      <label className="text-[11px] font-semibold opacity-60 block mb-1">Code-barre</label>
      <div className="flex items-center gap-2 mb-3">
        <input className="gb-focus flex-1 rounded-xl px-3 py-2 text-sm border font-mono min-w-0" style={{ borderColor: "var(--line)" }} placeholder="Code-barre" value={f.barcode} onChange={(e) => set("barcode", e.target.value)} />
        <button onClick={() => setScannerOpen(true)} className="gb-focus w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#EEEDFE" }} aria-label="Scanner le code-barre">
          <Barcode size={16} color="#534AB7" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <div>
          <label className="text-[11px] font-semibold opacity-60 block mb-1">Catégorie</label>
          <select className="gb-focus w-full rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} value={f.category} onChange={(e) => set("category", e.target.value)}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold opacity-60 block mb-1">Unité</label>
          <input className="gb-focus w-full rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder="Unité" value={f.unit} onChange={(e) => set("unit", e.target.value)} />
        </div>
        <div>
          <label className="text-[11px] font-semibold mb-1 flex items-center gap-1" style={{ color: "#854F0B" }}><ArrowDownCircle size={12} /> Prix d'achat ({symbol})</label>
          <input type="number" className="gb-focus w-full rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "#FAC775" }} placeholder="0" value={f.costPrice} onChange={(e) => set("costPrice", e.target.value)} />
        </div>
        <div>
          <label className="text-[11px] font-semibold mb-1 flex items-center gap-1" style={{ color: "#0F6E56" }}><ArrowUpCircle size={12} /> Prix de vente ({symbol})</label>
          <input type="number" className="gb-focus w-full rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "#9FE1CB" }} placeholder="0" value={f.price} onChange={(e) => set("price", e.target.value)} />
        </div>
        <div>
          <label className="text-[11px] font-semibold opacity-60 block mb-1">Stock</label>
          <input type="number" className="gb-focus w-full rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder="0" value={f.stock} onChange={(e) => set("stock", e.target.value)} />
        </div>
        <div>
          <label className="text-[11px] font-semibold opacity-60 block mb-1">Seuil d'alerte</label>
          <input type="number" className="gb-focus w-full rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder="Seuil d'alerte" value={f.minStock} onChange={(e) => set("minStock", e.target.value)} />
        </div>
      </div>
      {f.costPrice !== "" && f.price !== "" && !isNaN(margin) && (
        <p className="text-xs mb-3 px-1" style={{ color: margin >= 0 ? "#1CA857" : "var(--danger)" }}>
          Bénéfice unitaire : {margin >= 0 ? "+" : ""}{margin} {symbol} / {f.unit || "unité"}
        </p>
      )}

      <button
        onClick={() => set("favorite", !f.favorite)}
        className="gb-focus w-full flex items-center justify-between px-3 py-2.5 rounded-xl mb-2.5"
        style={{ background: "#EEEDFE" }}
      >
        <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#534AB7" }}><Star size={13} fill={f.favorite ? "#534AB7" : "none"} /> Produit favori (accès rapide à la vente)</span>
        <span className="w-9 h-5 rounded-full relative shrink-0 transition-colors" style={{ background: f.favorite ? "#534AB7" : "var(--line)" }}>
          <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: f.favorite ? 18 : 2 }} />
        </span>
      </button>

      <button
        onClick={() => setBulkEnabled((v) => !v)}
        className="gb-focus w-full flex items-center justify-between px-3 py-2.5 rounded-xl"
        style={{ background: "#E6F1FB" }}
      >
        <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#185FA5" }}><PackagePlus size={13} /> Prix spécial par quantité (ex : lot, pack)</span>
        <span className="w-9 h-5 rounded-full relative shrink-0 transition-colors" style={{ background: bulkEnabled ? "#185FA5" : "var(--line)" }}>
          <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: bulkEnabled ? 18 : 2 }} />
        </span>
      </button>

      {bulkEnabled && (
        <div className="grid grid-cols-2 gap-2.5 mt-2.5 gb-slide-up">
          <input type="number" className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder="Quantité (ex : 6)" value={f.bulkQty} onChange={(e) => set("bulkQty", e.target.value)} />
          <input type="number" className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder={`Prix du lot (${symbol})`} value={f.bulkPrice} onChange={(e) => set("bulkPrice", e.target.value)} />
          {f.bulkQty > 0 && f.bulkPrice > 0 && (
            <p className="col-span-2 text-xs opacity-50">Ex : {f.bulkQty} {f.unit}s achetés = {f.bulkPrice} {symbol} au lieu de {Number(f.bulkQty) * (Number(f.price) || 0)} {symbol}</p>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <button onClick={onCancel} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold border" style={{ borderColor: "var(--line)" }}>Annuler</button>
        <button onClick={async () => {
          if (!f.name || !f.barcode || !f.price) { pushToast("Nom, code-barre et prix de vente requis", "error"); return; }
          const duplicate = products.some((p) => p.barcode === f.barcode.trim() && p.id !== f.id);
          if (duplicate) { pushToast("Ce code-barre est déjà utilisé par un autre produit", "error"); return; }
          // Filet de sécurité pour les photos enregistrées avant la
          // compression automatique (non compressées, parfois plusieurs Mo) :
          // on les recompresse au moment d'enregistrer, même si la photo n'a
          // pas été retouchée, pour éviter que la sauvegarde échoue.
          let finalImage = f.image;
          if (finalImage && finalImage.length > 250000) {
            try { finalImage = await recompressDataUrl(finalImage); } catch { /* on garde l'image telle quelle si le recadrage échoue */ }
          }
          onSave({
            ...f,
            id: f.id || uid(),
            image: finalImage,
            barcode: f.barcode.trim(),
            price: Number(f.price) || 0,
            costPrice: Number(f.costPrice) || 0,
            stock: Number(f.stock) || 0,
            minStock: Number(f.minStock) || 5,
            bulkQty: bulkEnabled ? Number(f.bulkQty) || 0 : 0,
            bulkPrice: bulkEnabled ? Number(f.bulkPrice) || 0 : 0,
            favorite: !!f.favorite,
          });
        }} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg, #1D9E75, #0F6E56)" }}>Enregistrer</button>
      </div>
    </div>
  );
}

function SupplierForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState(initial || { name: "", phone: "", note: "" });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  return (
    <div className="rounded-2xl border p-4 mb-3 gb-slide-up" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
      <div className="flex flex-col gap-2.5">
        <input className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder="Nom du fournisseur" value={f.name} onChange={(e) => set("name", e.target.value)} />
        <input className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder="Téléphone" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
        <input className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder="Note (produits fournis…)" value={f.note} onChange={(e) => set("note", e.target.value)} />
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={onCancel} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--paper-dim)" }}>Annuler</button>
        <button onClick={() => { if (!f.name) return; onSave({ ...f, id: f.id || uid() }); }} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: "var(--glass)" }}>Enregistrer</button>
      </div>
    </div>
  );
}

function ExpenseForm({ onSave, onCancel, suppliers, author }) {
  const symbol = useCurrencySymbol();
  const [f, setF] = useState({ label: "", amount: "", date: new Date().toISOString().slice(0, 10), supplierId: "" });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  return (
    <div className="rounded-2xl border p-4 mb-3 gb-slide-up" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
      <div className="flex flex-col gap-2.5">
        <input className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder="Libellé (transport, glace…)" value={f.label} onChange={(e) => set("label", e.target.value)} />
        <input type="number" className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder={`Montant (${symbol})`} value={f.amount} onChange={(e) => set("amount", e.target.value)} />
        <input type="date" className="gb-focus w-full rounded-xl px-3 py-3 text-sm border" style={{ borderColor: "var(--line)", minWidth: 0 }} value={f.date} onChange={(e) => set("date", e.target.value)} />
        {suppliers.length > 0 && (
          <select className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} value={f.supplierId} onChange={(e) => set("supplierId", e.target.value)}>
            <option value="">Fournisseur (optionnel)</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={onCancel} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--paper-dim)" }}>Annuler</button>
        <button onClick={() => { if (!f.label || !f.amount) return; onSave({ id: uid(), label: f.label, amount: Number(f.amount), date: f.date, supplierId: f.supplierId || null, author: author || "Administrateur" }); }} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: "var(--glass)" }}>Enregistrer</button>
      </div>
    </div>
  );
}

function VendorForm({ initial, onSave, onCancel, pushToast, vendors, adminPin, adminPinHash, backendLinked }) {
  const [f, setF] = useState(initial ? { ...initial, pin: initial.pin || "" } : { name: "", pin: "" });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const isEdit = !!initial;
  return (
    <div className="rounded-2xl border p-4 mb-3 gb-slide-up" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
      <div className="flex flex-col gap-2.5">
        <input className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder="Nom du vendeur" value={f.name} onChange={(e) => set("name", e.target.value)} />
        <input className="gb-focus rounded-xl px-3 py-2 text-sm border font-mono" style={{ borderColor: "var(--line)" }} placeholder={backendLinked && isEdit ? "Nouveau PIN (laisser vide = inchangé)" : "Code PIN (4 chiffres)"} maxLength={4} value={f.pin} onChange={(e) => set("pin", e.target.value.replace(/\D/g, ""))} />
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={onCancel} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--paper-dim)" }}>Annuler</button>
        <button onClick={() => {
          if (!f.name) { pushToast("Nom requis", "error"); return; }
          const pinProvided = f.pin.length === 4;
          const keepExistingPin = backendLinked && isEdit && f.pin.length === 0;
          if (!pinProvided && !keepExistingPin) { pushToast("PIN à 4 chiffres requis", "error"); return; }
          if (pinProvided) {
            const duplicate = backendLinked
              ? api.verifyPin(f.pin, adminPinHash) || vendors.some((v) => v.id !== f.id && api.verifyPin(f.pin, v.pinHash))
              : f.pin === (adminPin || DEFAULT_ADMIN_PIN) || vendors.some((v) => v.pin === f.pin && v.id !== f.id);
            if (duplicate) { pushToast("Ce code PIN est déjà utilisé", "error"); return; }
          }
          const record = { id: f.id || uid(), name: f.name, phone: f.phone };
          if (backendLinked) {
            record.pinHash = pinProvided ? api.hashPin(f.pin) : initial?.pinHash;
            record.pin = pinProvided ? f.pin : initial?.pin;
            record.joinCode = initial?.joinCode || generateShopJoinCode();
          } else {
            record.pin = f.pin;
          }
          onSave(record);
        }} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: "var(--glass)" }}>Enregistrer</button>
      </div>
    </div>
  );
}

function CategoryForm({ initial, onSave, onCancel, pushToast, categories }) {
  const [label, setLabel] = useState(initial?.label || "");
  const [icon, setIcon] = useState(initial?.icon || "beer");
  const [color, setColor] = useState(initial?.color || COLOR_OPTIONS[0]);
  const SelectedIcon = ICON_MAP[icon] || Beer;
  const submit = () => {
    if (!label.trim()) { pushToast("Nom de catégorie requis", "error"); return; }
    const id = initial?.id || label.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || uid();
    if (!initial && categories.some((c) => c.id === id)) { pushToast("Cette catégorie existe déjà", "error"); return; }
    onSave({ id, label: label.trim(), icon, color });
  };
  return (
    <div className="rounded-2xl p-4 mb-3 gb-slide-up" style={{ border: `1px solid ${color}55`, background: "var(--card)" }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors" style={{ background: color }}>
          <SelectedIcon size={26} color="#fff" />
        </div>
        <input className="gb-focus flex-1 rounded-xl px-3 py-2.5 text-sm border" style={{ borderColor: "var(--line)" }} placeholder="Nom de la catégorie (ex : Cocktail)" value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>

      <p className="text-xs font-semibold opacity-60 mb-2 flex items-center gap-1.5"><Layers size={13} /> Icône</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {ICON_OPTIONS.map((o) => (
          <button key={o.id} onClick={() => setIcon(o.id)} className="gb-focus w-11 h-11 rounded-2xl flex items-center justify-center transition-all" style={{ background: icon === o.id ? color : "var(--paper-dim)", transform: icon === o.id ? "scale(1.06)" : "scale(1)", boxShadow: icon === o.id ? `0 4px 10px -3px ${color}99` : "none" }}>
            <o.Icon size={18} color={icon === o.id ? "#fff" : "var(--ink)"} />
          </button>
        ))}
      </div>

      <p className="text-xs font-semibold opacity-60 mb-2 flex items-center gap-1.5"><Star size={13} /> Couleur</p>
      <div className="flex flex-wrap gap-2.5 mb-4">
        {COLOR_OPTIONS.map((c) => (
          <button key={c} onClick={() => setColor(c)} className="gb-focus w-9 h-9 rounded-full flex items-center justify-center transition-transform" style={{ background: c, transform: color === c ? "scale(1.15)" : "scale(1)", boxShadow: color === c ? `0 0 0 2px var(--card), 0 0 0 4px ${c}` : "none" }}>
            {color === c && <Check size={15} color="#fff" strokeWidth={3} />}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mt-1">
        <button onClick={onCancel} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold border" style={{ borderColor: "var(--line)" }}>Annuler</button>
        <button onClick={submit} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)` }}>Enregistrer</button>
      </div>
    </div>
  );
}

function CategoriesSection({ categories, saveCategories, products, pushToast }) {
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const upsert = (c) => {
    const exists = categories.some((x) => x.id === c.id);
    saveCategories(exists ? categories.map((x) => (x.id === c.id ? c : x)) : [...categories, c]);
    setEditing(null); setAdding(false);
  };
  const del = (id) => {
    if (products.some((p) => p.category === id)) { pushToast("Catégorie utilisée par des produits — réassignez-les d'abord", "error"); return; }
    if (categories.length <= 1) { pushToast("Vous devez garder au moins une catégorie", "error"); return; }
    saveCategories(categories.filter((x) => x.id !== id));
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-base flex items-center gap-2"><Layers size={16} color="#534AB7" /> Catégories ({categories.length})</h3>
        <button onClick={() => { setAdding(true); setEditing(null); }} className="gb-focus flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white" style={{ background: "var(--glass)" }}><Plus size={14} /> Ajouter</button>
      </div>
      {adding && <CategoryForm categories={categories} onSave={upsert} onCancel={() => setAdding(false)} pushToast={pushToast} />}
      <div className="flex flex-col gap-2.5">
        {categories.map((c) => editing === c.id ? (
          <CategoryForm key={c.id} initial={c} categories={categories} onSave={upsert} onCancel={() => setEditing(null)} pushToast={pushToast} />
        ) : (
          <div key={c.id} className="rounded-2xl p-3 flex items-center gap-3" style={{ border: `1px solid ${c.color}40`, background: `${c.color}14` }}>
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: c.color }}>{(() => { const Icon = ICON_MAP[c.icon] || Beer; return <Icon size={19} color="#fff" />; })()}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{c.label}</div>
              <div className="text-xs opacity-60">{products.filter((p) => p.category === c.id).length} produit{products.filter((p) => p.category === c.id).length > 1 ? "s" : ""}</div>
            </div>
            <button onClick={() => { setEditing(c.id); setAdding(false); }} className="gb-focus w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--card)" }}><Pencil size={14} /></button>
            <button onClick={() => del(c.id)} className="gb-focus w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--card)" }}><Trash2 size={14} color="var(--danger)" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShopForm({ shops, onSave, onCancel, pushToast }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("maquis");
  const [customType, setCustomType] = useState("");
  const [currency, setCurrency] = useState("XAF");
  const [vendorName, setVendorName] = useState("");
  const [vendorPin, setVendorPin] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) { pushToast("Nom de l'entreprise requis", "error"); return; }
    // Insensible à la casse et aux espaces autour : "Cuatro" et "cuatro " comptent comme le même nom.
    const duplicate = (shops || []).some((s) => (s.name || "").trim().toLowerCase() === trimmed.toLowerCase());
    if (duplicate) { pushToast("Ce nom d'entreprise est déjà utilisé. Choisis-en un autre.", "error"); return; }
    if (type === "autre" && !customType.trim()) { pushToast("Précisez le type de votre établissement", "error"); return; }
    if (!vendorName.trim() || vendorPin.length !== 4) { pushToast("Nom et PIN du vendeur (4 chiffres) requis", "error"); return; }
    const finalType = type === "autre" && customType.trim() ? customType.trim() : type;
    setLoading(true);
    try {
      await onSave(
        { id: uid(), name: trimmed, type: finalType, currency, salesNotificationsEnabled: true, theme: "emeraude", darkMode: false, soundsEnabled: true, joinCode: generateShopJoinCode(), adminPin: DEFAULT_ADMIN_PIN },
        { id: uid(), name: vendorName.trim(), pin: vendorPin }
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="rounded-2xl p-4 mb-3 gb-slide-up" style={{ border: "1px solid #85B7EB", background: "var(--card)" }}>
      <p className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: "#185FA5" }}><Store size={14} /> Nouvelle entreprise</p>
      <div className="flex flex-col gap-2.5">
        <input className="gb-focus rounded-xl px-3 py-2.5 text-sm border" style={{ borderColor: "var(--line)" }} placeholder="Nom de l'entreprise" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          {ESTABLISHMENT_TYPES.map((t) => (
            <button key={t.id} onClick={() => setType(t.id)} className="gb-focus px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: type === t.id ? "var(--glass)" : "#E6F1FB", color: type === t.id ? "#fff" : "#185FA5" }}>{t.label}</button>
          ))}
        </div>
        {type === "autre" && (
          <input className="gb-focus rounded-xl px-3 py-2.5 text-sm border" style={{ borderColor: "var(--line)" }} placeholder="Précisez le type (ex : Épicerie, Salon de thé…)" value={customType} onChange={(e) => setCustomType(e.target.value)} />
        )}
        <select className="gb-focus rounded-xl px-3 py-2.5 text-sm border" style={{ borderColor: "var(--line)" }} value={currency} onChange={(e) => setCurrency(e.target.value)}>
          {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select>
        <div className="rounded-xl p-3 mt-1" style={{ background: "#E1F5EE" }}>
          <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: "#0F6E56" }}><UserPlus size={13} /> Premier vendeur de cette entreprise</p>
          <input className="gb-focus w-full rounded-xl px-3 py-2 text-sm border mb-2.5" style={{ borderColor: "var(--line)", background: "var(--card)" }} placeholder="Nom du vendeur" value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
          <input className="gb-focus w-full rounded-xl px-3 py-2 text-sm border font-mono" style={{ borderColor: "var(--line)", background: "var(--card)" }} placeholder="Code PIN (4 chiffres)" maxLength={4} value={vendorPin} onChange={(e) => setVendorPin(e.target.value.replace(/\D/g, "").slice(0, 4))} />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={onCancel} disabled={loading} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--paper-dim)", opacity: loading ? 0.5 : 1 }}>Annuler</button>
        <button onClick={submit} disabled={loading} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: "#185FA5", opacity: loading ? 0.6 : 1 }}>{loading ? "Création…" : "Créer l'entreprise"}</button>
      </div>
    </div>
  );
}

/* ---------- Sections admin ---------- */

// ---------- Factures professionnelles ----------
const INVOICE_TYPES = {
  facture: { label: "Facture", title: "FACTURE", prefix: "FAC" },
  proforma: { label: "Proforma", title: "FACTURE PROFORMA", prefix: "PRO" },
  bl: { label: "Bon de livraison", title: "BON DE LIVRAISON", prefix: "BL" },
};

// Montant en toutes lettres (francs CFA), pour la mention « Arrêtée la
// présente facture à la somme de … ».
function frenchNumberWords(n) {
  n = Math.floor(Math.abs(Number(n) || 0));
  if (n === 0) return "zéro";
  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"];
  const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante"];
  const below100 = (x, isEnd = true) => {
    if (x <= 16) return units[x];
    if (x < 20) return `dix-${units[x - 10]}`;
    if (x < 70) { const t = Math.floor(x / 10), u = x % 10; return u === 0 ? tens[t] : u === 1 ? `${tens[t]} et un` : `${tens[t]}-${units[u]}`; }
    if (x < 80) { const r = x - 60; return r === 11 ? "soixante et onze" : `soixante-${below100(r)}`; }
    const r = x - 80; return r === 0 ? (isEnd ? "quatre-vingts" : "quatre-vingt") : `quatre-vingt-${below100(r)}`;
  };
  const below1000 = (x, isEnd) => {
    const h = Math.floor(x / 100), r = x % 100;
    let out = "";
    if (h === 1) out = "cent"; else if (h > 1) out = `${units[h]} cent${r === 0 && isEnd ? "s" : ""}`;
    if (r) out = out ? `${out} ${below100(r, isEnd)}` : below100(r, isEnd);
    return out;
  };
  const parts = [];
  const billions = Math.floor(n / 1e9), millions = Math.floor((n % 1e9) / 1e6), thousands = Math.floor((n % 1e6) / 1000), rest = n % 1000;
  if (billions) parts.push(`${below1000(billions, true)} milliard${billions > 1 ? "s" : ""}`);
  if (millions) parts.push(`${below1000(millions, true)} million${millions > 1 ? "s" : ""}`);
  if (thousands) parts.push(thousands === 1 ? "mille" : `${below1000(thousands, false)} mille`);
  if (rest) parts.push(below1000(rest, true));
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function invoiceTotals(sale, vatRate) {
  const ttc = Math.max(0, Number(sale.total) || 0);
  const rate = Math.max(0, Number(vatRate) || 0);
  const ht = rate > 0 ? Math.round(ttc / (1 + rate / 100)) : ttc;
  return { ttc, ht, tva: ttc - ht, rate };
}

function nextInvoiceNumber(sales, type, date = new Date()) {
  const year = new Date(date).getFullYear();
  const prefix = `${INVOICE_TYPES[type]?.prefix || "FAC"}-${year}-`;
  let max = 0;
  (sales || []).forEach((s) => (s.invoices || []).forEach((inv) => {
    if (inv.type === type && String(inv.number || "").startsWith(prefix)) max = Math.max(max, Number(String(inv.number).slice(prefix.length)) || 0);
  }));
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

function InvoiceModal({ sale, sales, shop, onSaveInvoice, onClose, pushToast }) {
  const fmt = useFmt();
  const [type, setType] = useState("facture");
  const existing = (sale.invoices || []).find((i) => i.type === type) || null;
  // Reprend les coordonnées déjà saisies pour ce client sur une autre facture.
  const known = (() => {
    const name = (sale.clientName || "").trim().toLowerCase();
    if (!name) return null;
    for (const s of [...(sales || [])].sort((a, b) => new Date(b.date) - new Date(a.date))) {
      const inv = (s.invoices || []).find((i) => (i.client?.name || "").trim().toLowerCase() === name);
      if (inv) return inv.client;
    }
    return null;
  })();
  const [client, setClient] = useState(() => ({ name: sale.clientName || "", taxId: "", address: "", ...(known || {}), ...((sale.invoices || [])[0]?.client || {}) }));
  const [busy, setBusy] = useState("");
  const vatRate = type === "bl" ? 0 : Number(shop?.vatRate) || 0;
  const t = invoiceTotals(sale, vatRate);
  const number = existing?.number || nextInvoiceNumber(sales, type);
  const invDate = existing?.date || new Date().toISOString();
  const lines = (sale.items || []).map((i) => {
    const total = computeItemTotal(i.product, i.qty);
    return { name: i.product?.name || "?", qty: i.qty, unit: i.qty ? Math.round(total / i.qty) : 0, total };
  });
  const setC = (k, v) => setClient((c) => ({ ...c, [k]: v }));
  const meta = INVOICE_TYPES[type];
  const words = `${frenchNumberWords(t.ttc)} francs CFA`;
  const ensureSaved = () => {
    const inv = { type, number, date: invDate, client: { name: client.name.trim(), taxId: client.taxId.trim(), address: client.address.trim() }, vatRate, by: "" };
    if (!existing || JSON.stringify(existing.client) !== JSON.stringify(inv.client)) onSaveInvoice?.(sale.id, inv);
    return inv;
  };
  const plain = (v) => String(v ?? "").replace(/[  ]/g, " ").replace(/−/g, "-").replace(/…/g, "...").replace(/[’]/g, "'");
  const doPdf = async () => {
    if (type === "facture" && !client.name.trim()) { pushToast?.("Indiquez le nom du client", "error"); return; }
    setBusy("pdf");
    try {
      const inv = ensureSaved();
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const W = 595, L = 48, R = 547;
      let y = 60;
      doc.setTextColor(22, 32, 42); doc.setFont("helvetica", "bold"); doc.setFontSize(20);
      doc.text(plain(shop?.name || ""), L, y);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(91, 100, 112);
      const typeLabel = ESTABLISHMENT_TYPES.find((x) => x.id === shop?.type)?.label || shop?.type || "";
      const left = [typeLabel, shop?.invoiceAddress, shop?.invoicePhone ? `Tél. ${shop.invoicePhone}` : "", shop?.invoiceEmail, shop?.taxId ? `N° contribuable : ${shop.taxId}` : "", shop?.rccm ? `RCCM : ${shop.rccm}` : ""].filter(Boolean);
      left.forEach((l, i) => doc.text(plain(l), L, y + 16 + i * 13));
      doc.setTextColor(15, 110, 86); doc.setFont("helvetica", "bold"); doc.setFontSize(type === "facture" ? 22 : 16);
      doc.text(meta.title, R, y, { align: "right" });
      doc.setTextColor(22, 32, 42); doc.setFontSize(11); doc.text(plain(`N° ${inv.number}`), R, y + 20, { align: "right" });
      doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(91, 100, 112);
      doc.text(plain(`Date : ${new Date(inv.date).toLocaleDateString("fr-FR")}`), R, y + 35, { align: "right" });
      doc.text(plain(`Réf. vente : ${receiptNumber(sale.id)} du ${new Date(sale.date).toLocaleDateString("fr-FR")}`), R, y + 48, { align: "right" });
      y = Math.max(y + 16 + left.length * 13, y + 60) + 18;
      // Client
      const clientLines = [inv.client.name || "Client", inv.client.taxId ? `N° contribuable : ${inv.client.taxId}` : "", inv.client.address].filter(Boolean);
      const boxH = 26 + clientLines.length * 14;
      doc.setFillColor(244, 243, 239); doc.roundedRect(L, y, 260, boxH, 6, 6, "F");
      doc.setFontSize(8.5); doc.setTextColor(91, 100, 112); doc.text(type === "bl" ? "LIVRÉ À" : "FACTURÉ À", L + 12, y + 16);
      doc.setTextColor(22, 32, 42);
      clientLines.forEach((l, i) => { doc.setFont("helvetica", i === 0 ? "bold" : "normal"); doc.setFontSize(i === 0 ? 11 : 9.5); doc.text(plain(l), L + 12, y + 32 + i * 14); });
      y += boxH + 26;
      // Tableau
      const cols = type === "bl" ? [["Désignation", L + 10, "left"], ["Quantité", R - 10, "right"]] : [["Désignation", L + 10, "left"], ["Qté", L + 290, "right"], [vatRate ? "P.U. TTC" : "Prix unitaire", L + 390, "right"], [vatRate ? "Total TTC" : "Total", R - 10, "right"]];
      doc.setFillColor(31, 42, 51); doc.rect(L, y, R - L, 24, "F");
      doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
      cols.forEach(([label, x, align]) => doc.text(label, x, y + 16, { align }));
      y += 24; doc.setTextColor(22, 32, 42); doc.setFont("helvetica", "normal");
      lines.forEach((ln, i) => {
        if (y > 700) { doc.addPage(); y = 60; }
        if (i % 2 === 1) { doc.setFillColor(248, 247, 243); doc.rect(L, y, R - L, 22, "F"); }
        const name = doc.splitTextToSize(plain(ln.name), type === "bl" ? 380 : 220)[0];
        doc.text(name, L + 10, y + 15);
        if (type === "bl") doc.text(String(ln.qty), R - 10, y + 15, { align: "right" });
        else { doc.text(String(ln.qty), L + 290, y + 15, { align: "right" }); doc.text(plain(fmt(ln.unit)), L + 390, y + 15, { align: "right" }); doc.text(plain(fmt(ln.total)), R - 10, y + 15, { align: "right" }); }
        y += 22;
      });
      doc.setDrawColor(226, 224, 217); doc.line(L, y, R, y);
      y += 18;
      if (type !== "bl") {
        const TX = R - 220;
        const rows = vatRate ? [["Total HT", fmt(t.ht)], [`TVA ${String(vatRate).replace(".", ",")} %`, fmt(t.tva)]] : [];
        rows.forEach(([l, v]) => { doc.setFontSize(10); doc.setTextColor(91, 100, 112); doc.text(plain(l), TX, y); doc.setTextColor(22, 32, 42); doc.text(plain(v), R, y, { align: "right" }); y += 16; });
        doc.setFillColor(31, 42, 51); doc.roundedRect(TX - 10, y - 4, 230, 28, 5, 5, "F");
        doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
        doc.text(vatRate ? "Total TTC" : "Total à payer", TX, y + 14); doc.text(plain(fmt(t.ttc)), R - 6, y + 14, { align: "right" });
        y += 50;
        doc.setTextColor(74, 82, 92); doc.setFont("helvetica", "italic"); doc.setFontSize(9.5);
        const sentence = doc.splitTextToSize(plain(`Arrêtée la présente ${type === "proforma" ? "facture proforma" : "facture"} à la somme de ${words}.`), R - L);
        doc.text(sentence, L, y); y += sentence.length * 13 + 8;
        if (!vatRate) { doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.text("TVA non applicable.", L, y); y += 14; }
        if (type === "proforma") { doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.text("Proforma valable 15 jours, sous réserve de disponibilité du stock.", L, y); y += 14; }
      }
      y = Math.max(y + 30, 690);
      doc.setDrawColor(150); doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(91, 100, 112);
      if (type === "bl") { doc.line(L, y, L + 180, y); doc.text("Signature du client (reçu conforme)", L, y + 14); }
      doc.line(R - 180, y, R, y); doc.text("Cachet et signature", R, y + 14, { align: "right" });
      doc.setFontSize(8); doc.setTextColor(140);
      doc.text(plain(shop?.invoiceFooter || "Merci pour votre confiance."), W / 2, 800, { align: "center" });
      doc.text(plain(`${shop?.name || ""}${shop?.taxId ? ` · N° contribuable ${shop.taxId}` : ""}${shop?.rccm ? ` · RCCM ${shop.rccm}` : ""}`), W / 2, 812, { align: "center" });
      await exportPdfDoc(`${inv.number}.pdf`, doc);
    } catch { pushToast?.("Impossible de générer le PDF", "error"); }
    setBusy("");
  };
  const share = () => {
    const inv = ensureSaved();
    const text = [
      `${shop?.name || ""} — ${meta.title} N° ${inv.number}`,
      `Date : ${new Date(inv.date).toLocaleDateString("fr-FR")}`,
      `Client : ${inv.client.name || "Client"}`,
      "",
      ...lines.map((l) => (type === "bl" ? `${l.qty} × ${l.name}` : `${l.qty} × ${l.name} : ${fmt(l.total)}`)),
      "",
      ...(type === "bl" ? [] : vatRate ? [`Total HT : ${fmt(t.ht)}`, `TVA ${vatRate} % : ${fmt(t.tva)}`, `Total TTC : ${fmt(t.ttc)}`] : [`Total : ${fmt(t.ttc)}`]),
    ].map(plain).join("\n");
    shareText(meta.title, text).catch(() => {});
  };
  const missingShopInfo = !shop?.taxId && !shop?.rccm;
  return (
    <div className="fixed inset-0 z-[93] flex items-end sm:items-center justify-center no-print" style={{ background: "rgba(22,32,42,0.55)", padding: "max(24px, env(safe-area-inset-top)) 0 0" }} onClick={onClose}>
      <div className="w-full max-w-[460px] rounded-t-[26px] sm:rounded-[26px] flex flex-col gb-slide-up" style={{ background: "var(--paper)", maxHeight: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pt-4 pb-3 flex items-center gap-3 shrink-0" style={{ borderBottom: "1px solid var(--line)" }}>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold uppercase tracking-wider opacity-60">Vente N° {receiptNumber(sale.id)}</p>
            <p className="font-display font-bold text-[19px] leading-tight">Document client</p>
          </div>
          <button onClick={onClose} className="gb-focus w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }} aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto gb-scroll px-5 pt-4 pb-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {Object.entries(INVOICE_TYPES).map(([id, m]) => (
              <button key={id} onClick={() => setType(id)} className="gb-focus px-3.5 py-2 rounded-full text-[13px] font-semibold" style={{ background: type === id ? "#1F2A33" : "var(--card)", color: type === id ? "#fff" : "var(--ink)", border: type === id ? "1px solid #1F2A33" : "1px solid var(--line)" }}>{m.label}</button>
            ))}
          </div>
          {missingShopInfo && <p className="text-[12.5px] rounded-xl px-3 py-2.5 mb-3" style={{ background: "#FFF1D6", color: "#6E3C00" }}>Ajoutez votre N° contribuable, RCCM et TVA dans Admin › Établissement › Facturation.</p>}
          <div className="rounded-2xl p-3.5 mb-3 flex flex-col gap-2" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>
            <p className="text-[12px] font-bold uppercase tracking-wider opacity-60">Client</p>
            <input value={client.name} onChange={(e) => setC("name", e.target.value)} placeholder="Nom ou raison sociale" className="gb-focus w-full rounded-xl px-3 py-2.5 text-[14px]" style={{ border: "1px solid var(--line)" }} />
            <input value={client.taxId} onChange={(e) => setC("taxId", e.target.value)} placeholder="N° contribuable du client (facultatif)" className="gb-focus w-full rounded-xl px-3 py-2.5 text-[14px]" style={{ border: "1px solid var(--line)" }} />
            <input value={client.address} onChange={(e) => setC("address", e.target.value)} placeholder="Adresse ou téléphone (facultatif)" className="gb-focus w-full rounded-xl px-3 py-2.5 text-[14px]" style={{ border: "1px solid var(--line)" }} />
          </div>
          <div className="rounded-2xl p-4 flex flex-col gap-3 text-[12px]" style={{ background: "#fff", color: "#16202A", border: "1px solid #E6E4DD", boxShadow: "0 6px 24px rgba(22,32,42,0.08)" }}>
            <div className="flex justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display font-bold text-[16px] break-words">{shop?.name}</p>
                {[shop?.invoiceAddress, shop?.invoicePhone && `Tél. ${shop.invoicePhone}`, shop?.taxId && `N° contribuable ${shop.taxId}`, shop?.rccm && `RCCM ${shop.rccm}`].filter(Boolean).map((l) => <p key={l} style={{ color: "#5B6470" }} className="break-words">{l}</p>)}
              </div>
              <div className="text-right shrink-0">
                <p className="font-display font-bold text-[13px]" style={{ color: "#0F6E56" }}>{meta.title}</p>
                <p className="font-bold">N° {number}</p>
                <p style={{ color: "#5B6470" }}>{new Date(invDate).toLocaleDateString("fr-FR")}</p>
              </div>
            </div>
            <div className="rounded-xl px-3 py-2" style={{ background: "#F4F3EF" }}>
              <p style={{ color: "#5B6470" }}>{type === "bl" ? "Livré à" : "Facturé à"}</p>
              <p className="font-bold text-[13px] break-words">{client.name || "Client"}</p>
              {client.taxId && <p style={{ color: "#5B6470" }}>N° contribuable {client.taxId}</p>}
              {client.address && <p style={{ color: "#5B6470" }} className="break-words">{client.address}</p>}
            </div>
            <div>
              {lines.map((l, i) => (
                <div key={i} className="flex justify-between gap-3 py-1.5" style={{ borderBottom: "1px solid #EFEDE7" }}>
                  <span className="min-w-0 break-words">{l.qty} × {l.name}</span>
                  {type !== "bl" && <span className="font-mono font-semibold whitespace-nowrap">{fmt(l.total)}</span>}
                </div>
              ))}
            </div>
            {type !== "bl" && (
              <div className="self-end w-[70%] flex flex-col gap-1">
                {vatRate > 0 && <div className="flex justify-between"><span style={{ color: "#5B6470" }}>Total HT</span><b className="font-mono whitespace-nowrap">{fmt(t.ht)}</b></div>}
                {vatRate > 0 && <div className="flex justify-between"><span style={{ color: "#5B6470" }}>TVA {vatRate} %</span><b className="font-mono whitespace-nowrap">{fmt(t.tva)}</b></div>}
                <div className="flex justify-between px-2.5 py-2 rounded-lg text-white font-bold text-[13px]" style={{ background: "#1F2A33" }}><span>{vatRate > 0 ? "Total TTC" : "Total"}</span><span className="whitespace-nowrap">{fmt(t.ttc)}</span></div>
              </div>
            )}
            {type !== "bl" && <p className="italic" style={{ color: "#5B6470" }}>Arrêtée la présente {type === "proforma" ? "facture proforma" : "facture"} à la somme de {words}.</p>}
          </div>
          {existing && <p className="text-[12px] opacity-60 mt-2">Ce document a déjà le numéro {existing.number} : il garde le même numéro à chaque réédition.</p>}
        </div>
        <div className="px-5 pt-3 grid grid-cols-2 gap-2 shrink-0" style={{ borderTop: "1px solid var(--line)", paddingBottom: "max(18px, calc(env(safe-area-inset-bottom) + 12px))" }}>
          <button onClick={doPdf} disabled={!!busy} className="gb-focus min-h-[52px] rounded-2xl text-[14.5px] font-bold flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: "#fff", border: "1px solid var(--line)" }}><Download size={17} />{busy ? "…" : "PDF"}</button>
          <button onClick={share} className="gb-focus min-h-[52px] rounded-2xl text-white text-[14.5px] font-bold flex items-center justify-center gap-2" style={{ background: "#1F2A33" }}><Send size={17} /> Envoyer</button>
        </div>
      </div>
    </div>
  );
}

function InvoiceSettingsCard({ shop, saveShopMeta }) {
  const [f, setF] = useState({ taxId: shop.taxId || "", rccm: shop.rccm || "", invoiceAddress: shop.invoiceAddress || "", invoicePhone: shop.invoicePhone || "", invoiceEmail: shop.invoiceEmail || "", vatRate: shop.vatRate ?? "", invoiceFooter: shop.invoiceFooter || "" });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const field = (k, label, ph, props = {}) => (
    <div className="mb-3">
      <label className="text-xs font-semibold opacity-60 block mb-1.5">{label}</label>
      <input value={f[k]} onChange={(e) => set(k, e.target.value)} placeholder={ph} className="gb-focus w-full rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} {...props} />
    </div>
  );
  return (
    <div className="rounded-2xl border p-4 mt-4" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
      <p className="text-[14.5px] font-bold flex items-center gap-2 mb-0.5"><FileText size={15} /> Facturation</p>
      <p className="text-[12px] opacity-60 mb-3">Ces informations apparaissent sur les factures, proformas et bons de livraison.</p>
      {field("taxId", "N° contribuable", "Ex : M012345678901X")}
      {field("rccm", "RCCM", "Ex : RC/XXX/2024/B/1234")}
      {field("invoiceAddress", "Adresse", "Quartier, ville")}
      {field("invoicePhone", "Téléphone", "Numéro affiché sur les factures", { inputMode: "tel" })}
      {field("invoiceEmail", "E-mail (facultatif)", "contact@…", { inputMode: "email" })}
      <div className="mb-3">
        <label className="text-xs font-semibold opacity-60 block mb-1.5">TVA appliquée (%)</label>
        <input value={f.vatRate} onChange={(e) => set("vatRate", e.target.value.replace(/[^\d.,]/g, "").replace(",", "."))} placeholder="0 si non assujetti" inputMode="decimal" className="gb-focus w-full rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} />
        <p className="text-[11px] opacity-45 mt-1">Vos prix de vente sont considérés TTC : la facture en déduit le montant hors taxe et la TVA.</p>
      </div>
      {field("invoiceFooter", "Mention en bas de page", "Ex : Merci pour votre confiance.")}
      <button onClick={() => saveShopMeta({ ...shop, ...f, vatRate: f.vatRate === "" ? 0 : Number(f.vatRate) || 0 })} className="gb-focus w-full rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: "var(--glass)" }}>Enregistrer la facturation</button>
    </div>
  );
}

function EstablishmentSection({ shop, saveShopMeta, pushToast }) {
  const [f, setF] = useState({ salesNotificationsEnabled: true, theme: "emeraude", darkMode: false, soundsEnabled: true, ...shop });
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [btPrintDisabled, setBtPrintDisabled] = useState(false);
  useEffect(() => { setBtPrintDisabled(isBluetoothPrintDisabled()); }, []);
  // Si le type actuel n'est pas l'un des ids standards, c'est déjà un
  // libellé personnalisé saisi via "Autre" (ex : "Épicerie") — on le
  // reprend tel quel dans le champ de précision.
  const [customType, setCustomType] = useState(() => (f.type && !ESTABLISHMENT_TYPES.some((t) => t.id === f.type)) ? f.type : "");
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const submit = () => {
    if (f.type === "autre" && !customType.trim()) { pushToast("Précisez le type de votre établissement", "error"); return; }
    const finalType = f.type === "autre" && customType.trim() ? customType.trim() : f.type;
    // Les réglages gérés ailleurs (facturation, sécurité, objectifs) gardent
    // leur valeur actuelle : ce formulaire ne les réécrit pas.
    const { taxId, rccm, invoiceAddress, invoicePhone, invoiceEmail, vatRate, invoiceFooter, autoLockMinutes, protectSensitive, vendorGoals, ...rest } = f;
    saveShopMeta({ ...shop, ...rest, type: finalType });
  };
  const copyJoinCode = async () => {
    try { await navigator.clipboard.writeText(shop.joinCode); pushToast?.("Code copié !", "ok"); } catch { /* presse-papier indisponible */ }
  };
  const selectedCurrency = CURRENCIES.find((c) => c.code === f.currency) || CURRENCIES[0];
  return (
    <div>
      <h3 className="font-display font-bold text-base mb-3">Informations de l'entreprise</h3>
      {shop.backendLinked && shop.joinCode && (
        <div className="rounded-2xl p-4 mb-4 flex items-center justify-between" style={{ background: "#E1F5EE" }}>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide flex items-center gap-1.5 mb-1" style={{ color: "#0F6E56" }}>
              <UserPlus size={12} /> Code d'invitation vendeurs
            </p>
            <p className="font-display font-bold text-2xl tracking-[0.15em]" style={{ color: "#0F6E56" }}>{shop.joinCode}</p>
          </div>
          <button onClick={copyJoinCode} className="gb-focus px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0" style={{ background: "var(--card)", color: "#0F6E56" }}>
            <Download size={13} className="rotate-180" /> Copier
          </button>
        </div>
      )}
      <div className="rounded-2xl border p-4" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
        <label className="text-xs font-semibold opacity-60 block mb-1.5">Nom</label>
        <input className="gb-focus w-full rounded-xl px-3 py-2 text-sm border mb-4" style={{ borderColor: "var(--line)" }} value={f.name} onChange={(e) => set("name", e.target.value)} />

        <label className="text-xs font-semibold opacity-60 mb-1.5 flex items-center gap-1.5"><User size={13} color="#534AB7" /> Nom affiché de l'administrateur</label>
        <input
          className="gb-focus w-full rounded-xl px-3 py-2 text-sm border mb-4"
          style={{ borderColor: "var(--line)" }}
          placeholder="Administrateur"
          value={f.adminDisplayName || ""}
          onChange={(e) => set("adminDisplayName", e.target.value)}
        />
        <p className="text-[11px] opacity-45 -mt-3 mb-4">Ce nom remplace "Administrateur" sur vos ventes, dépenses et reçus. Laissez vide pour garder "Administrateur".</p>

        <label className="text-xs font-semibold opacity-60 mb-1.5 flex items-center gap-1.5"><Store size={13} color="#534AB7" /> Type</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {ESTABLISHMENT_TYPES.map((t) => (
            <button key={t.id} onClick={() => { set("type", t.id); if (t.id !== "autre") setCustomType(""); }} className="gb-focus px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: (f.type === t.id || (t.id === "autre" && customType)) ? "var(--glass)" : "#EEEDFE", color: (f.type === t.id || (t.id === "autre" && customType)) ? "#fff" : "#534AB7" }}>{t.label}</button>
          ))}
        </div>
        {(f.type === "autre" || customType) && (
          <input autoFocus={f.type === "autre" && !customType} className="gb-focus w-full rounded-xl px-3 py-2 text-sm border mb-4" style={{ borderColor: "var(--line)" }} placeholder="Précisez le type (ex : Épicerie, Salon de thé…)" value={customType} onChange={(e) => { setCustomType(e.target.value); set("type", "autre"); }} />
        )}

        <label className="text-xs font-semibold opacity-60 mb-1.5 flex items-center gap-1.5"><Banknote size={13} color="#185FA5" /> Devise</label>
        <div className="rounded-xl overflow-hidden mb-4" style={{ border: `1px solid ${currencyOpen ? "var(--glass)" : "var(--line)"}` }}>
          <button onClick={() => setCurrencyOpen((v) => !v)} className="gb-focus w-full flex items-center justify-between px-3.5 py-3" style={{ background: "#E6F1FB" }}>
            <span className="text-sm font-semibold" style={{ color: "#185FA5" }}>{selectedCurrency.label}</span>
            <ChevronDown size={16} color="#185FA5" style={{ transform: currencyOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
          </button>
          {currencyOpen && (
            <div>
              {CURRENCIES.filter((c) => c.code !== selectedCurrency.code).map((c) => (
                <button key={c.code} onClick={() => { set("currency", c.code); setCurrencyOpen(false); }} className="gb-focus w-full flex items-center justify-between px-3.5 py-3 text-left" style={{ borderTop: "1px solid var(--line)" }}>
                  <span className="text-sm">{c.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <label className="text-xs font-semibold opacity-60 mb-1.5 flex items-center gap-1.5"><Layers size={13} color="#993556" /> Couleur de l'application</label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {THEME_PRESETS.map((t) => (
            <button key={t.id} onClick={() => set("theme", t.id)} className="gb-focus rounded-xl p-2.5 flex flex-col items-center gap-1.5" style={{ background: (f.theme || "emeraude") === t.id ? "#FBEAF0" : "transparent", border: (f.theme || "emeraude") === t.id ? "1px solid #D4537E" : "1px solid var(--line)" }}>
              <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: t.glass }}>
                {(f.theme || "emeraude") === t.id && <Check size={13} color={t.cap} />}
              </span>
              <span className="text-[10px] font-semibold">{t.label}</span>
            </button>
          ))}
        </div>

        <label className="text-xs font-semibold opacity-60 block mb-1.5">Apparence</label>
        <button
          onClick={() => set("darkMode", !f.darkMode)}
          className="gb-focus w-full flex items-center justify-between mb-4 px-3 py-2.5 rounded-xl"
          style={{ background: "#EEEDFE" }}
        >
          <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#534AB7" }}>{f.darkMode ? <Moon size={13} /> : <Sun size={13} />} Mode {f.darkMode ? "nuit" : "jour"}</span>
          <span className="w-9 h-5 rounded-full relative shrink-0 transition-colors" style={{ background: f.darkMode ? "#534AB7" : "var(--line)" }}>
            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: f.darkMode ? 18 : 2 }} />
          </span>
        </button>

        <label className="text-xs font-semibold opacity-60 block mb-1.5">Notifications</label>
        <button
          onClick={() => set("soundsEnabled", !f.soundsEnabled)}
          className="gb-focus w-full flex items-center justify-between mb-2.5 px-3 py-2.5 rounded-xl"
          style={{ background: "#FAEEDA" }}
        >
          <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#854F0B" }}><Volume2 size={13} /> Sons de confirmation (scan, vente)</span>
          <span className="w-9 h-5 rounded-full relative shrink-0 transition-colors" style={{ background: f.soundsEnabled ? "#854F0B" : "var(--line)" }}>
            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: f.soundsEnabled ? 18 : 2 }} />
          </span>
        </button>
        <button
          onClick={() => set("salesNotificationsEnabled", !f.salesNotificationsEnabled)}
          className="gb-focus w-full flex items-center justify-between mb-2.5 px-3 py-2.5 rounded-xl"
          style={{ background: "#FAEEDA" }}
        >
          <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#854F0B" }}><Bell size={13} /> Notifications de vente pour l'administrateur</span>
          <span className="w-9 h-5 rounded-full relative shrink-0 transition-colors" style={{ background: f.salesNotificationsEnabled ? "#854F0B" : "var(--line)" }}>
            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: f.salesNotificationsEnabled ? 18 : 2 }} />
          </span>
        </button>
        <button
          onClick={() => {
            const next = !f.voiceNotificationsEnabled;
            set("voiceNotificationsEnabled", next);
            // Sauvegarde IMMÉDIATE, sans attendre le bouton "Enregistrer" du
            // formulaire — sinon la confirmation vocale ci-dessous donne
            // l'impression que c'est activé alors que shop.voiceNotificationsEnabled
            // (la valeur réellement lue partout ailleurs dans l'app) ne
            // changeait qu'après un clic séparé sur "Enregistrer", jamais fait
            // en pratique. C'est très exactement ce qui rendait toutes les
            // autres annonces silencieuses malgré une confirmation qui, elle,
            // parlait bien (elle ne dépendait pas de la sauvegarde).
            saveShopMeta({ ...shop, voiceNotificationsEnabled: next });
            if (next) speak("Vous venez d'activer l'annonce vocale.", true);
          }}
          className="gb-focus w-full flex items-center justify-between mb-4 px-3 py-2.5 rounded-xl"
          style={{ background: "#FAEEDA" }}
        >
          <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#854F0B" }}><Volume2 size={13} /> Notifications vocales (ventes, dépenses, crédit/avoir au scan, stock bas, licence)</span>
          <span className="w-9 h-5 rounded-full relative shrink-0 transition-colors" style={{ background: f.voiceNotificationsEnabled ? "#854F0B" : "var(--line)" }}>
            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: f.voiceNotificationsEnabled ? 18 : 2 }} />
          </span>
        </button>
        <label className="text-xs font-semibold opacity-60 block mb-1.5 flex items-center gap-1.5"><Gift size={13} color="#993556" /> Fidélité (achats avant récompense)</label>
        <input type="number" min="1" className="gb-focus w-full rounded-xl px-3 py-2 text-sm border mb-4" style={{ borderColor: "var(--line)" }} value={f.loyaltyThreshold ?? 10} onChange={(e) => set("loyaltyThreshold", Number(e.target.value) || 10)} />

        <label className="text-xs font-semibold opacity-60 block mb-1.5 flex items-center gap-1.5"><Banknote size={13} color="#854F0B" /> Heure d'enregistrement du montant (fonds de caisse)</label>
        <select className="gb-focus w-full rounded-xl px-3 py-2.5 text-sm border mb-1.5" style={{ borderColor: "var(--line)" }} value={f.cashRegisterResetHour ?? 0} onChange={(e) => set("cashRegisterResetHour", Number(e.target.value))}>
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
          ))}
        </select>
        <p className="text-[11px] opacity-50 mb-4 leading-snug">La fenêtre de fond de caisse redemandera un nouveau montant à partir de cette heure chaque jour — utile si la boutique reste ouverte après minuit (ex : 06:00 pour un bar qui ferme tard).</p>

        <label className="text-xs font-semibold opacity-60 block mb-1.5">Impression</label>
        <button
          onClick={() => { const next = !btPrintDisabled; setBtPrintDisabled(next); setBluetoothPrintDisabled(next); }}
          className="gb-focus w-full flex items-center justify-between mb-1.5 px-3 py-2.5 rounded-xl"
          style={{ background: "#FCEBE8" }}
        >
          <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--danger)" }}><Printer size={13} /> Désactiver l'impression Bluetooth directe</span>
          <span className="w-9 h-5 rounded-full relative shrink-0 transition-colors" style={{ background: btPrintDisabled ? "var(--danger)" : "var(--line)" }}>
            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: btPrintDisabled ? 18 : 2 }} />
          </span>
        </button>
        <p className="text-[11px] opacity-50 mb-4 leading-snug">À activer si l'impression sur imprimante Bluetooth fait planter l'application. Les reçus restent disponibles via Partager / WhatsApp.</p>

        <label className="text-xs font-semibold opacity-60 block mb-1.5">Langue de l'application</label>
        <div className="flex gap-2 mb-4">
          <button onClick={() => set("language", "fr")} className="gb-focus flex-1 rounded-xl py-2 text-sm font-semibold" style={{ background: (f.language || "fr") === "fr" ? "var(--glass)" : "var(--paper-dim)", color: (f.language || "fr") === "fr" ? "#fff" : "var(--ink)" }}>Français</button>
          <button onClick={() => set("language", "en")} className="gb-focus flex-1 rounded-xl py-2 text-sm font-semibold" style={{ background: f.language === "en" ? "var(--glass)" : "var(--paper-dim)", color: f.language === "en" ? "#fff" : "var(--ink)" }}>English</button>
        </div>
        <p className="text-[10px] opacity-40 mb-4">La traduction couvre pour l'instant la navigation principale — le reste de l'application arrivera en anglais complet avec l'app native.</p>

        <button onClick={submit} className="gb-focus w-full rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: "var(--glass)" }}>Enregistrer</button>
      </div>
      <InvoiceSettingsCard shop={shop} saveShopMeta={saveShopMeta} />
    </div>
  );
}

function BoutiquesSection({ shops, activeShopId, onSwitchShop, onCreateShop, onDeleteShop, pushToast }) {
  const [adding, setAdding] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const askDelete = (id) => {
    if (shops.length <= 1) { pushToast("Vous devez garder au moins une entreprise", "error"); return; }
    setConfirmId(id);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-base flex items-center gap-2"><Layers size={16} color="#185FA5" /> Entreprises ({shops.length})</h3>
        <button onClick={() => setAdding(true)} className="gb-focus flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white" style={{ background: "var(--glass)" }}><Plus size={14} /> Nouvelle</button>
      </div>
      {adding && <ShopForm shops={shops} onSave={async (shop, vendor) => { const ok = await onCreateShop(shop, vendor); if (ok) setAdding(false); }} onCancel={() => setAdding(false)} pushToast={pushToast} />}
      <div className="flex flex-col gap-2.5">
        {shops.map((s) => {
          const isActive = s.id === activeShopId;
          const typeLabel = ESTABLISHMENT_TYPES.find((t) => t.id === s.type)?.label || s.type || "";
          const currencyLabel = (CURRENCIES.find((c) => c.code === s.currency) || CURRENCIES[0]).symbol;
          return (
            <div key={s.id} className="rounded-2xl p-3.5" style={{ border: `1px solid ${isActive ? "#378ADD" : "var(--line)"}`, background: "var(--card)" }}>
              <div className="flex items-center gap-3 mb-2.5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#E6F1FB" }}><Store size={17} color="#185FA5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                    {s.name}
                    {isActive && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white" style={{ background: "#185FA5" }}>ACTIVE</span>}
                  </div>
                  <div className="text-xs opacity-50">{typeLabel} · {currencyLabel}</div>
                </div>
              </div>
              {s.joinCode && (
                <div className="flex items-center justify-between rounded-xl px-3 py-2.5 mb-2.5" style={{ background: "#E6F1FB" }}>
                  <span className="text-[11px] font-medium" style={{ color: "#185FA5" }}>Code d'invitation vendeurs</span>
                  <span className="font-mono font-bold text-sm tracking-wider" style={{ color: "#185FA5" }}>{s.joinCode}</span>
                </div>
              )}
              {confirmId === s.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs flex-1" style={{ color: "var(--danger)" }}>Supprimer définitivement cette entreprise et ses données ?</span>
                  <button onClick={() => { onDeleteShop(s.id); setConfirmId(null); }} className="gb-focus px-3 py-1.5 rounded-full text-[11px] font-semibold text-white shrink-0" style={{ background: "var(--danger)" }}>Confirmer</button>
                  <button onClick={() => setConfirmId(null)} className="gb-focus px-3 py-1.5 rounded-full text-[11px] font-semibold shrink-0" style={{ background: "var(--paper-dim)" }}>Annuler</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  {!isActive && <button onClick={() => onSwitchShop(s.id)} className="gb-focus flex-1 rounded-full py-1.5 text-[11px] font-semibold text-white" style={{ background: "#185FA5" }}>Passer à cette entreprise</button>}
                  <button onClick={() => askDelete(s.id)} className="gb-focus flex items-center justify-center gap-1 rounded-full py-1.5 text-[11px] font-semibold" style={{ background: "var(--paper-dim)", flex: isActive ? 1 : "0 0 auto", paddingLeft: isActive ? 0 : 12, paddingRight: isActive ? 0 : 12 }}>
                    <Trash2 size={12} color="var(--danger)" /> <span style={{ color: "var(--danger)" }}>Supprimer</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DailyReportPreview({ shop, sales, expenses, onClose, pushToast }) {
  const fmt = useFmt();
  const [exporting, setExporting] = useState(false);
  const today = new Date().toDateString();
  const todaySales = sales.filter((s) => new Date(s.date).toDateString() === today);
  const todayExpenses = expenses.filter((e) => new Date(e.date).toDateString() === today);
  const cash = todaySales.filter((s) => s.paymentMethod === "especes").reduce((s, x) => s + x.total, 0);
  const mobile = todaySales.filter((s) => s.paymentMethod === "mobile").reduce((s, x) => s + x.total, 0);
  const creditGiven = todaySales.filter((s) => s.paymentMethod === "credit").reduce((s, x) => s + x.total, 0);
  // Même correctif que HistoryScreen/StatsSection : chaque règlement de
  // crédit (même le premier versement partiel encaissé le jour même de la
  // vente) compte dans l'argent réellement en caisse aujourd'hui.
  const creditCollected = sales
    .filter((s) => s.paymentMethod === "credit")
    .reduce((sum, s) => sum + creditPaymentsOf(s).filter((p) => new Date(p.date).toDateString() === today).reduce((s2, p) => s2 + p.amount, 0), 0);
  const totalExpenses = todayExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const netCash = cash + mobile + creditCollected - totalExpenses;
  const topProducts = buildTopProducts(todaySales, 5);
  const byVendor = {};
  todaySales.forEach((s) => { byVendor[s.vendor] = (byVendor[s.vendor] || 0) + s.total; });

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      let y = 50;
      doc.setFont("helvetica", "bold"); doc.setFontSize(16);
      doc.text(shop.name, 297.5, y, { align: "center" }); y += 20;
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(90);
      doc.text(`Rapport du ${new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}`, 297.5, y, { align: "center" }); y += 28;
      doc.setTextColor(20);

      const rows = [
        ["Espèces", fmt(cash)], ["Mobile Money", fmt(mobile)],
        ["Crédits accordés", fmt(creditGiven)], ["Crédits encaissés", fmt(creditCollected)],
        ["Dépenses du jour", `- ${fmt(totalExpenses)}`],
      ];
      doc.setFontSize(10);
      rows.forEach(([label, value]) => {
        doc.text(label, 40, y); doc.text(value, 555, y, { align: "right" }); y += 18;
      });
      y += 6; doc.setDrawColor(20); doc.setLineWidth(1); doc.line(40, y, 555, y); y += 18;
      doc.setFont("helvetica", "bold"); doc.setFontSize(12);
      doc.text("CAISSE NETTE ESTIMÉE", 40, y); doc.text(fmt(netCash), 555, y, { align: "right" }); y += 30;

      if (Object.keys(byVendor).length > 0) {
        doc.setFontSize(11); doc.text("Ventes par vendeur", 40, y); y += 16;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10);
        Object.entries(byVendor).forEach(([name, total]) => { doc.text(name, 40, y); doc.text(fmt(total), 555, y, { align: "right" }); y += 16; });
        y += 12;
      }
      if (topProducts.length > 0) {
        doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text("Produits les plus vendus aujourd'hui", 40, y); y += 16;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10);
        topProducts.forEach((p) => { doc.text(p.name, 40, y); doc.text(String(p.qty), 555, y, { align: "right" }); y += 16; });
        y += 12;
      }
      doc.setFontSize(8); doc.setTextColor(120);
      doc.text(`${todaySales.length} vente${todaySales.length > 1 ? "s" : ""} enregistrée${todaySales.length > 1 ? "s" : ""} · Généré le ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`, 297.5, y, { align: "center" });

      await exportPdfDoc(`rapport_${new Date().toISOString().slice(0, 10)}.pdf`, doc);
    } catch {
      pushToast?.("Impossible de générer le PDF", "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-6">
      <div className="absolute inset-0 bg-black/50 no-print" onClick={onClose} />
      <div id="daily-report-print-area" className="relative w-full max-w-[500px] bg-white rounded-2xl p-6 gb-pop">
        <div className="flex items-center justify-between mb-5 no-print">
          <h2 className="font-display font-bold text-lg">Rapport de fin de journée</h2>
          <button onClick={onClose} className="gb-focus p-1"><X size={20} /></button>
        </div>

        <div className="text-center mb-6">
          <p className="font-display font-bold text-xl">{shop.name}</p>
          <p className="text-xs opacity-60 mt-0.5">Rapport du {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
          <div className="rounded-xl p-3" style={{ background: "#F4F6F1" }}><p className="text-[10px] opacity-50">Espèces</p><p className="font-mono font-bold">{fmt(cash)}</p></div>
          <div className="rounded-xl p-3" style={{ background: "#F4F6F1" }}><p className="text-[10px] opacity-50">Mobile Money</p><p className="font-mono font-bold">{fmt(mobile)}</p></div>
          <div className="rounded-xl p-3" style={{ background: "#F4F6F1" }}><p className="text-[10px] opacity-50">Crédits accordés</p><p className="font-mono font-bold">{fmt(creditGiven)}</p></div>
          <div className="rounded-xl p-3" style={{ background: "#F4F6F1" }}><p className="text-[10px] opacity-50">Crédits encaissés</p><p className="font-mono font-bold">{fmt(creditCollected)}</p></div>
        </div>

        <div className="flex justify-between text-xs py-1.5 border-t" style={{ borderColor: "#D8DFD4" }}><span className="opacity-60">Dépenses du jour</span><span className="font-mono">- {fmt(totalExpenses)}</span></div>
        <div className="flex justify-between items-baseline font-bold text-sm mt-2 pt-2 border-t-2" style={{ borderColor: "#0F1B16" }}>
          <span>CAISSE NETTE ESTIMÉE</span><span className="font-mono text-base">{fmt(netCash)}</span>
        </div>

        {Object.keys(byVendor).length > 0 && (
          <>
            <p className="text-xs font-semibold mt-5 mb-1.5 opacity-70">Ventes par vendeur</p>
            {Object.entries(byVendor).map(([name, total]) => (
              <div key={name} className="flex justify-between text-xs py-1"><span>{name}</span><span className="font-mono">{fmt(total)}</span></div>
            ))}
          </>
        )}

        {topProducts.length > 0 && (
          <>
            <p className="text-xs font-semibold mt-4 mb-1.5 opacity-70">Produits les plus vendus aujourd'hui</p>
            {topProducts.map((p) => (
              <div key={p.name} className="flex justify-between text-xs py-1"><span>{p.name}</span><span className="font-mono">{p.qty}</span></div>
            ))}
          </>
        )}

        <p className="text-center text-[10px] opacity-40 mt-6">{todaySales.length} vente{todaySales.length > 1 ? "s" : ""} enregistrée{todaySales.length > 1 ? "s" : ""} · Généré le {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>

        <div className="flex gap-2 mt-6 no-print">
          <button onClick={onClose} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--paper-dim)" }}>Fermer</button>
          <button onClick={handleExportPdf} disabled={exporting} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-1.5 disabled:opacity-60" style={{ background: "var(--glass)" }}>
            <Printer size={14} /> {exporting ? "Génération…" : "Imprimer / Enregistrer PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatsSection({ shop, products, sales, expenses, pushToast }) {
  const fmt = useFmt();
  const [period, setPeriod] = useState("semaine");
  const [showDailyReport, setShowDailyReport] = useState(false);
  const today = new Date().toDateString();
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const todaySales = sales.filter((s) => new Date(s.date).toDateString() === today);
  const cashToday = todaySales.filter((s) => s.paymentMethod !== "credit").reduce((s, x) => s + x.total, 0);
  const creditGivenTodayUnpaid = todaySales.filter((s) => s.paymentMethod === "credit" && !s.paid).reduce((s, x) => s + (x.total - creditPaidSoFar(x)), 0);
  // Chaque règlement de crédit — même partiel — compte dans la recette le
  // jour où il a réellement été encaissé, pas le jour de la vente d'origine
  // ni seulement une fois le crédit totalement soldé (voir HistoryScreen,
  // même logique).
  const creditCollectedToday = sales
    .filter((s) => s.paymentMethod === "credit")
    .reduce((sum, s) => sum + creditPaymentsOf(s).filter((p) => new Date(p.date).toDateString() === today).reduce((s2, p) => s2 + p.amount, 0), 0);
  const revenueToday = cashToday + creditCollectedToday;
  const lowStock = products.filter((p) => p.stock <= p.minStock);
  const expensesThisMonth = expenses.filter((e) => { const d = new Date(e.date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; }).reduce((s, e) => s + Number(e.amount), 0);
  const creditSales = sales.filter((s) => s.paymentMethod === "credit" && !s.paid);
  const creditTotal = creditSales.reduce((s, x) => s + x.total, 0);
  const series = period === "semaine" ? buildDailySeries(sales, 7) : buildMonthlySeries(sales, 6);
  const topProducts = buildTopProducts(sales);
  const hourlySeries = buildHourlySeries(sales);

  const compareDays = period === "semaine" ? 7 : 30;
  const currentEnd = new Date();
  const currentStart = new Date(); currentStart.setDate(currentStart.getDate() - compareDays);
  const prevEnd = currentStart;
  const prevStart = new Date(currentStart); prevStart.setDate(prevStart.getDate() - compareDays);
  const currentRevenue = sumRevenueBetween(sales, currentStart, currentEnd);
  const prevRevenue = sumRevenueBetween(sales, prevStart, prevEnd);
  const deltaPct = prevRevenue > 0 ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100) : (currentRevenue > 0 ? 100 : 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display font-bold text-base">Vue d'ensemble</h3>
        <button onClick={() => setShowDailyReport(true)} className="gb-focus flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "var(--paper-dim)" }}><Printer size={13} /> Rapport du jour</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 mb-2">
        <StatCard icon={TrendingUp} label="Recette aujourd'hui" value={fmt(revenueToday)} dark />
        <StatCard icon={Receipt} label="Ventes aujourd'hui" value={todaySales.length} />
      </div>
      {(creditCollectedToday > 0 || creditGivenTodayUnpaid > 0) && (
        <div className="flex flex-col gap-1 px-1 mb-4">
          {creditCollectedToday > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs opacity-50">Dont crédits encaissés aujourd'hui (inclus)</span>
              <span className="font-mono text-xs font-semibold">{fmt(creditCollectedToday)}</span>
            </div>
          )}
          {creditGivenTodayUnpaid > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs opacity-50">Nouveaux crédits accordés (non inclus)</span>
              <span className="font-mono text-xs font-semibold" style={{ color: "var(--danger)" }}>{fmt(creditGivenTodayUnpaid)}</span>
            </div>
          )}
        </div>
      )}
      {showDailyReport && <DailyReportPreview shop={shop} sales={sales} expenses={expenses} onClose={() => setShowDailyReport(false)} pushToast={pushToast} />}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 mb-5">
        <StatCard icon={AlertTriangle} label="Produits en alerte" value={lowStock.length} danger={lowStock.length > 0} />
        <StatCard icon={Wallet} label="Dépenses (mois)" value={fmt(expensesThisMonth)} />
        <StatCard icon={CreditCard} label="Crédits en cours (total)" value={fmt(creditTotal)} danger={creditTotal > 0} />
      </div>

      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display font-bold text-base">Évolution des ventes</h3>
        <div className="flex gap-1.5">
          <button onClick={() => setPeriod("semaine")} className="gb-focus px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: period === "semaine" ? "var(--glass)" : "var(--paper-dim)", color: period === "semaine" ? "#fff" : "var(--ink)" }}>7 jours</button>
          <button onClick={() => setPeriod("mois")} className="gb-focus px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: period === "mois" ? "var(--glass)" : "var(--paper-dim)", color: period === "mois" ? "#fff" : "var(--ink)" }}>6 mois</button>
        </div>
      </div>
      <div className="rounded-2xl border p-3 mb-3" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip formatter={(v) => fmt(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="total" fill="var(--glass)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border p-3.5 mb-5 flex items-center justify-between" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
        <div>
          <p className="text-[10px] opacity-50">{period === "semaine" ? "7 derniers jours" : "30 derniers jours"}</p>
          <p className="font-mono font-bold text-sm">{fmt(currentRevenue)}</p>
          <p className="text-[10px] opacity-40 mt-0.5">vs {fmt(prevRevenue)} période précédente</p>
        </div>
        <span className="px-2.5 py-1.5 rounded-full text-xs font-bold shrink-0" style={{ background: deltaPct >= 0 ? "#E7F7EE" : "#FCEBE8", color: deltaPct >= 0 ? "#1CA857" : "var(--danger)" }}>
          {deltaPct >= 0 ? "+" : ""}{deltaPct}%
        </span>
      </div>

      <h3 className="font-display font-bold text-base mb-2">Heures de forte affluence</h3>
      <div className="rounded-2xl border p-3 mb-5" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
        {sales.length === 0 ? <p className="text-sm opacity-50 text-center py-4">Pas encore de ventes.</p> : (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={hourlySeries}>
              <XAxis dataKey="label" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} interval={2} />
              <YAxis hide />
              <Tooltip formatter={(v, n) => [n === "count" ? `${v} vente${v > 1 ? "s" : ""}` : fmt(v), ""]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="count" fill="var(--soda)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <h3 className="font-display font-bold text-base mb-2">Produits les plus vendus</h3>
      <div className="rounded-2xl border p-3 mb-5" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
        {topProducts.length === 0 && <p className="text-sm opacity-50 text-center py-4">Pas encore de ventes.</p>}
        {topProducts.length > 0 && (
          <ResponsiveContainer width="100%" height={Math.max(topProducts.length * 36, 60)}>
            <BarChart data={topProducts} layout="vertical" margin={{ left: 8 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="qty" fill="var(--cap)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {creditSales.length > 0 && (
        <p className="text-xs opacity-50 text-center">{creditSales.length} crédit{creditSales.length > 1 ? "s" : ""} en attente — à encaisser depuis l'onglet <strong>Crédits</strong>.</p>
      )}
    </div>
  );
}

function ProductsSection({ products, saveProducts, categories, movements, saveMovements, author, pushToast, pushNotification, requireAdmin }) {
  const fmt = useFmt();
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const upsert = (p) => {
    const existing = products.find((x) => x.id === p.id);
    const priceChanged = existing && (Number(existing.price) !== Number(p.price) || Number(existing.bulkPrice || 0) !== Number(p.bulkPrice || 0));
    if (priceChanged && requireAdmin) { requireAdmin(`Changer le prix de ${p.name}`, () => doUpsert(p)); return; }
    doUpsert(p);
  };
  const doUpsert = (p) => {
    const existing = products.find((x) => x.id === p.id);
    let nextP = p;
    if (!existing) {
      nextP = { ...p, openingStock: p.stock, openingStockDate: new Date().toISOString() };
      saveMovements([{ id: uid(), date: new Date().toISOString(), productId: p.id, productName: p.name, type: "creation", delta: p.stock, before: 0, after: p.stock, author, note: "" }, ...movements]);
      pushNotification?.({ type: "product_created", productName: p.name });
    } else if (existing.stock !== p.stock) {
      const delta = p.stock - existing.stock;
      // Le stock de départ reste figé à sa date : la correction apparaît comme
      // un "ajustement manuel" daté dans la fiche de stock.
      nextP = { ...p, openingStock: existing.openingStock ?? existing.stock, openingStockDate: existing.openingStockDate };
      saveMovements([{ id: uid(), date: new Date().toISOString(), productId: p.id, productName: p.name, type: "ajustement", delta, before: existing.stock, after: p.stock, author, note: "" }, ...movements]);
      pushNotification?.({ type: "product_updated", productName: p.name, delta });
    } else {
      nextP = { ...p, openingStock: existing.openingStock ?? existing.stock, openingStockDate: existing.openingStockDate };
      pushNotification?.({ type: "product_updated", productName: p.name, delta: 0 });
    }
    saveProducts(existing ? products.map((x) => (x.id === p.id ? nextP : x)) : [...products, nextP]);
    setEditing(null); setAdding(false);
  };
  const del = (id, name) => {
    if (!window.confirm(`Supprimer "${name}" ?`)) return;
    const run = () => { saveProducts(products.filter((x) => x.id !== id)); pushNotification?.({ type: "product_deleted", productName: name }); };
    if (requireAdmin) requireAdmin(`Supprimer le produit ${name}`, run); else run();
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-base flex items-center gap-2"><Boxes size={16} color="#534AB7" /> Produits ({products.length})</h3>
        <button onClick={() => { setAdding(true); setEditing(null); }} className="gb-focus flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white" style={{ background: "var(--glass)" }}><PackagePlus size={14} /> Ajouter</button>
      </div>
      {adding && <ProductForm categories={categories} products={products} pushToast={pushToast} onSave={upsert} onCancel={() => setAdding(false)} />}
      <div className="flex flex-col gap-2.5">
        {products.map((p) => editing === p.id ? (
          <ProductForm key={p.id} initial={p} categories={categories} products={products} pushToast={pushToast} onSave={upsert} onCancel={() => setEditing(null)} />
        ) : (
          <div key={p.id} className="rounded-2xl p-3 flex items-center gap-3" style={{ border: `1px solid ${p.stock <= p.minStock ? "#F09595" : "var(--line)"}`, background: "var(--card)" }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${getCategory(categories, p.category).color}1f` }}><CategoryIcon cat={p.category} categories={categories} size={19} /></div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                {p.name}
                {p.favorite && <Star size={11} color="var(--cap)" fill="var(--cap)" className="shrink-0" />}
              </div>
              <div className="text-xs opacity-50 font-mono mt-0.5">{fmt(p.price)} · {p.stock} {p.unit}s{p.bulkQty > 0 && p.bulkPrice > 0 ? ` · lot ${p.bulkQty}=${fmt(p.bulkPrice)}` : ""}</div>
            </div>
            {p.stock <= p.minStock && (
              <span className="text-[9px] font-bold px-2 py-1 rounded-full shrink-0" style={{ background: "#FCEBEB", color: "#A32D2D" }}>STOCK BAS</span>
            )}
            <button onClick={() => { setEditing(p.id); setAdding(false); }} className="gb-focus w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><Pencil size={14} /></button>
            <button onClick={() => del(p.id, p.name)} className="gb-focus w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><Trash2 size={14} color="var(--danger)" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Inventaire professionnel ---------- */

function InventoryOverview({ products, categories, movements }) {
  const fmt = useFmt();
  const totalValue = products.reduce((s, p) => s + p.stock * p.price, 0);
  const totalUnits = products.reduce((s, p) => s + p.stock, 0);
  const lowStock = products.filter((p) => p.stock <= p.minStock);
  const outOfStock = products.filter((p) => p.stock <= 0);
  const today = new Date().toDateString();
  const movementsToday = movements.filter((m) => new Date(m.date).toDateString() === today).length;
  const byCategory = categories.map((c) => ({
    ...c,
    units: products.filter((p) => p.category === c.id).reduce((s, p) => s + p.stock, 0),
    value: products.filter((p) => p.category === c.id).reduce((s, p) => s + p.stock * p.price, 0),
  })).filter((c) => c.units > 0);
  const maxUnits = Math.max(...byCategory.map((c) => c.units), 1);

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 mb-5">
        <StatCard icon={Layers} label="Valeur du stock" value={fmt(totalValue)} dark />
        <StatCard icon={Boxes} label="Unités en stock" value={totalUnits} tintBg="#E6F1FB" tintFg="#185FA5" />
        <StatCard icon={AlertTriangle} label="Produits en alerte" value={lowStock.length} danger={lowStock.length > 0} tintBg={lowStock.length > 0 ? "#FCEBEB" : undefined} tintFg={lowStock.length > 0 ? "#A32D2D" : undefined} />
        <StatCard icon={ClipboardList} label="Mouvements aujourd'hui" value={movementsToday} tintBg="#EEEDFE" tintFg="#534AB7" />
      </div>

      {outOfStock.length > 0 && (
        <div className="rounded-2xl p-3.5 mb-4 flex items-center gap-2.5" style={{ background: "#FCEBE8" }}>
          <AlertTriangle size={16} color="var(--danger)" className="shrink-0" />
          <p className="text-xs font-semibold" style={{ color: "var(--danger)" }}>{outOfStock.length} produit{outOfStock.length > 1 ? "s" : ""} en rupture totale de stock</p>
        </div>
      )}

      <h3 className="font-display font-bold text-base mb-2">Répartition par catégorie</h3>
      <div className="rounded-2xl border p-3.5 flex flex-col gap-3" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
        {byCategory.length === 0 && <p className="text-sm opacity-50 text-center py-3">Aucun stock enregistré.</p>}
        {byCategory.map((c) => (
          <div key={c.id}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold flex items-center gap-1.5"><CategoryIcon cat={c.id} categories={categories} size={13} /> {c.label}</span>
              <span className="text-xs font-mono opacity-60">{c.units} u. · {fmt(c.value)}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--paper-dim)" }}>
              <div className="h-full rounded-full" style={{ width: `${(c.units / maxUnits) * 100}%`, background: c.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MovementsLedger({ movements, categories }) {
  const [filter, setFilter] = useState("all");
  const [period, setPeriod] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const byType = filter === "all" ? movements : movements.filter((m) => m.type === filter);
  const byDate = byType.filter((m) => {
    const d = new Date(m.date);
    if (period === "today") return d.toDateString() === new Date().toDateString();
    if (period === "7j") { const from = new Date(); from.setDate(from.getDate() - 7); return d >= from; }
    if (period === "30j") { const from = new Date(); from.setDate(from.getDate() - 30); return d >= from; }
    if (period === "custom") {
      if (customFrom && d < new Date(customFrom + "T00:00:00")) return false;
      if (customTo && d > new Date(customTo + "T23:59:59")) return false;
      return true;
    }
    return true;
  });
  const filtered = byDate;

  const PERIODS = [
    { id: "all", label: "Tout" },
    { id: "today", label: "Aujourd'hui" },
    { id: "7j", label: "7 jours" },
    { id: "30j", label: "30 jours" },
    { id: "custom", label: "Plage" },
  ];

  return (
    <div>
      <h3 className="font-display font-bold text-base mb-2">Historique des mouvements</h3>

      <p className="text-[11px] font-semibold opacity-50 mb-1.5">Période</p>
      <div className="flex gap-2 overflow-x-auto gb-scroll mb-2">
        {PERIODS.map((p) => (
          <button key={p.id} onClick={() => setPeriod(p.id)} className="gb-focus shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold" style={{ background: period === p.id ? "var(--glass)" : "var(--paper-dim)", color: period === p.id ? "#fff" : "var(--ink)" }}>{p.label}</button>
        ))}
      </div>
      {period === "custom" && (
        <div className="flex items-center gap-2 mb-3 gb-slide-up">
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="gb-focus flex-1 rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} />
          <span className="text-xs opacity-50">à</span>
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="gb-focus flex-1 rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} />
        </div>
      )}

      <p className="text-[11px] font-semibold opacity-50 mb-1.5">Type</p>
      <div className="flex gap-2 overflow-x-auto gb-scroll mb-4">
        <button onClick={() => setFilter("all")} className="gb-focus shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold" style={{ background: filter === "all" ? "var(--glass)" : "var(--paper-dim)", color: filter === "all" ? "#fff" : "var(--ink)" }}>Tout</button>
        {Object.entries(MOVEMENT_TYPES).map(([id, meta]) => (
          <button key={id} onClick={() => setFilter(id)} className="gb-focus shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold" style={{ background: filter === id ? "var(--glass)" : "var(--paper-dim)", color: filter === id ? "#fff" : "var(--ink)" }}>{meta.label}</button>
        ))}
      </div>
      <p className="text-[11px] opacity-40 mb-3">{filtered.length} mouvement{filtered.length > 1 ? "s" : ""}</p>
      {filtered.length === 0 && <p className="text-sm opacity-50 text-center py-8">Aucun mouvement pour cette période.</p>}
      <div className="flex flex-col gap-2">
        {filtered.slice(0, 100).map((m) => {
          const meta = MOVEMENT_TYPES[m.type] || { label: m.type, color: "var(--ink)" };
          const positive = m.delta > 0;
          return (
            <div key={m.id} className="rounded-xl p-3 border flex items-center gap-3" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
              {positive ? <ArrowUpCircle size={18} color="#1CA857" className="shrink-0" /> : m.delta < 0 ? <ArrowDownCircle size={18} color="var(--danger)" className="shrink-0" /> : <Pencil size={18} color="var(--ink)" className="shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{m.productName}</div>
                <div className="text-[11px] opacity-50 flex items-center gap-1.5 flex-wrap">
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold text-white" style={{ background: meta.color }}>{meta.label}</span>
                  <span>{m.author} · {new Date(m.date).toLocaleDateString("fr-FR")} {new Date(m.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono font-bold text-sm" style={{ color: positive ? "#1CA857" : m.delta < 0 ? "var(--danger)" : "var(--ink)" }}>{positive ? "+" : ""}{m.delta}</div>
                <div className="text-[10px] opacity-40 font-mono">{m.before}→{m.after}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StockCountSection({ products, saveProducts, movements, saveMovements, categories, author, pushToast, pushNotification }) {
  const [counts, setCounts] = useState({});
  const [query, setQuery] = useState("");
  const setCount = (id, v) => setCounts((c) => ({ ...c, [id]: v }));

  const filtered = products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
  const rows = filtered.map((p) => {
    const raw = counts[p.id];
    const hasEntry = raw !== undefined && raw !== "";
    const countedNum = hasEntry ? Number(raw) : p.stock;
    return { p, hasEntry, countedNum, diff: countedNum - p.stock };
  });
  const changed = rows.filter((r) => r.hasEntry && r.diff !== 0);

  const validate = () => {
    if (changed.length === 0) { pushToast("Aucun écart à valider", "error"); return; }
    const nextProducts = products.map((p) => {
      const row = changed.find((r) => r.p.id === p.id);
      return row ? { ...p, stock: row.countedNum } : p;
    });
    saveProducts(nextProducts);
    const newMovements = changed.map((r) => ({ id: uid(), date: new Date().toISOString(), productId: r.p.id, productName: r.p.name, type: "comptage", delta: r.diff, before: r.p.stock, after: r.countedNum, author, note: "" }));
    saveMovements([...newMovements, ...movements]);
    pushToast(`Comptage validé — ${changed.length} écart${changed.length > 1 ? "s" : ""} ajusté${changed.length > 1 ? "s" : ""}`, "ok");
    pushNotification?.({ type: "stock_movement", movementType: "comptage", count: changed.length });
    setCounts({});
  };

  return (
    <div className="pb-16">
      <div className="rounded-2xl p-3.5 mb-4 flex items-start gap-2.5" style={{ background: "var(--paper-dim)" }}>
        <ClipboardCheck size={16} className="shrink-0 mt-0.5" />
        <p className="text-xs opacity-70">Saisis la quantité physiquement comptée pour chaque produit. Seuls les écarts seront appliqués au stock, avec traçabilité dans les mouvements.</p>
      </div>
      <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-3" style={{ background: "var(--paper-dim)" }}>
        <Search size={15} className="opacity-50" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un produit" className="gb-focus bg-transparent outline-none text-sm flex-1 min-w-0" />
      </div>
      <div className="flex flex-col gap-2">
        {rows.map(({ p, diff, hasEntry }) => (
          <div key={p.id} className="rounded-xl p-3 border flex items-center gap-3" style={{ borderColor: hasEntry && diff !== 0 ? "var(--cap)" : "var(--line)", background: "var(--card)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><CategoryIcon cat={p.category} categories={categories} size={14} /></div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{p.name}</div>
              <div className="text-[11px] opacity-50 font-mono">Système : {p.stock} {p.unit}s</div>
            </div>
            <input
              type="number"
              value={counts[p.id] ?? ""}
              onChange={(e) => setCount(p.id, e.target.value)}
              placeholder={String(p.stock)}
              className="gb-focus w-16 text-center rounded-lg px-2 py-1.5 text-sm border font-mono shrink-0"
              style={{ borderColor: "var(--line)" }}
            />
            {hasEntry && diff !== 0 && (
              <span className="text-xs font-mono font-bold shrink-0 w-10 text-right" style={{ color: diff > 0 ? "#1CA857" : "var(--danger)" }}>{diff > 0 ? "+" : ""}{diff}</span>
            )}
          </div>
        ))}
      </div>

      {changed.length > 0 && (
        <div className="fixed left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-[380px] no-print gb-slide-up" style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}>
          <button onClick={validate} className="gb-focus w-full rounded-2xl py-3.5 font-semibold text-sm shadow-xl flex items-center justify-center gap-2 text-white" style={{ background: "var(--glass)" }}>
            <ClipboardCheck size={16} /> Valider {changed.length} écart{changed.length > 1 ? "s" : ""}
          </button>
        </div>
      )}
    </div>
  );
}

function ProfitabilitySection({ products, sales, saveSales, movements, saveProducts, inventories, saveInventories, categories, author, pushToast }) {
  const fmt = useFmt();
  const symbol = useCurrencySymbol();
  const [confirming, setConfirming] = useState(false);
  const [periodFilter, setPeriodFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Coût d'achat actuel de chaque produit (sert de repli quand la vente a été
  // enregistrée avant que le prix d'achat soit renseigné).
  const currentCostById = new Map((products || []).map((p) => [p.id, Number(p.costPrice) || 0]));

  // RÉPARATION DE LA BASE DE DONNÉES : les ventes faites avant que le prix
  // d'achat d'un produit soit saisi ont gardé un coût à 0 dans leur "photo"
  // du produit, ce qui donnait une marge égale au chiffre d'affaires (ex :
  // Beaufort, Castel). On complète ces ventes avec le prix d'achat actuel,
  // puis on les sauvegarde (localement + synchronisation serveur). Opération
  // idempotente : une vente déjà complétée n'est plus modifiée.
  const repairDoneRef = useRef(false);
  useEffect(() => {
    if (repairDoneRef.current || !saveSales || !Array.isArray(sales) || !products?.length) return;
    let changed = false;
    const repaired = sales.map((s) => {
      if (!Array.isArray(s.items)) return s;
      let saleChanged = false;
      const items = s.items.map((it) => {
        const prod = it.product;
        const pid = prod?.id || it.id;
        if (!prod || !pid) return it;
        const snapCost = Number(prod.costPrice) || 0;
        const curCost = currentCostById.get(pid) || 0;
        if (snapCost > 0 || curCost <= 0) return it;
        saleChanged = true;
        return { ...it, product: { ...prod, costPrice: curCost } };
      });
      if (!saleChanged) return s;
      changed = true;
      return { ...s, items };
    });
    repairDoneRef.current = true;
    if (changed) {
      saveSales(repaired);
      pushToast?.("Marges corrigées : prix d'achat complétés sur les anciennes ventes", "ok");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, products]);

  // Rentabilité basée sur les VENTES RÉELLES et leur date, pas sur un delta de
  // stock — permet de filtrer par période (aujourd'hui, 7 jours, plage
  // personnalisée...). Chaque vente garde une "photo" du produit au moment de
  // la vente (prix et coût d'achat de l'époque), donc les chiffres restent
  // corrects même si le prix a changé depuis.
  const now = new Date();
  const periodSales = sales.filter((s) => {
    const d = new Date(s.date);
    if (periodFilter === "today") return d.toDateString() === now.toDateString();
    if (periodFilter === "7j") return now - d <= 7 * MS_DAY;
    if (periodFilter === "30j") return now - d <= 30 * MS_DAY;
    if (periodFilter === "custom") {
      if (!customFrom && !customTo) return true;
      const from = customFrom ? new Date(customFrom + "T00:00:00") : null;
      const to = customTo ? new Date(customTo + "T23:59:59") : null;
      return (!from || d >= from) && (!to || d <= to);
    }
    return true;
  });

  const productMap = new Map();
  periodSales.forEach((s) => {
    (s.items || []).forEach((it) => {
      const prod = it.product;
      const pid = prod?.id || it.id;
      if (!pid) return;
      const qty = Number(it.qty) || 0;
      // Chiffre d'affaires réel de la ligne, prix de lot inclus (même calcul
      // que le panier et le reçu).
      const lineRevenue = prod ? computeItemTotal({ ...prod, price: Number(prod.price) || 0 }, qty) : 0;
      // Coût : celui enregistré au moment de la vente, sinon le prix d'achat
      // actuel du produit.
      const snapCost = Number(prod?.costPrice) || 0;
      const cost = snapCost > 0 ? snapCost : (currentCostById.get(pid) || 0);
      const entry = productMap.get(pid) || { id: pid, name: prod?.name || "Produit supprimé", category: prod?.category, sold: 0, revenue: 0, cost: 0, missingCostQty: 0 };
      entry.sold += qty;
      entry.revenue += lineRevenue;
      entry.cost += qty * cost;
      if (cost <= 0) entry.missingCostQty += qty;
      productMap.set(pid, entry);
    });
  });
  const periodRows = Array.from(productMap.values()).map((r) => ({ ...r, profit: r.revenue - r.cost, costMissing: r.missingCostQty > 0 })).sort((a, b) => b.revenue - a.revenue);
  const periodTotals = periodRows.reduce((acc, r) => ({ sold: acc.sold + r.sold, revenue: acc.revenue + r.revenue, cost: acc.cost + r.cost, profit: acc.profit + r.profit }), { sold: 0, revenue: 0, cost: 0, profit: 0 });

  // Depuis le stock de départ de chaque produit (création ou dernier
  // inventaire validé) : départ + arrivages ± ajustements − ventes = actuel.
  // Calcul partagé avec la fiche de stock (buildStockLedger).
  const stockRows = products.map((p) => {
    const L = buildStockLedger(p, { sales: sales || [], movements: movements || [], inventories: inventories || [] });
    const totalProfit = L.revenue - L.cost;
    const unitProfit = L.sold > 0 ? totalProfit / L.sold : p.price - (p.costPrice || 0);
    return { p, L, openingStock: L.opening, sold: L.sold, unitProfit, totalProfit, cost: L.cost, revenue: L.revenue };
  });
  const stockTotals = stockRows.reduce((acc, r) => ({ sold: acc.sold + r.sold, revenue: acc.revenue + r.revenue, cost: acc.cost + r.cost, profit: acc.profit + r.totalProfit }), { sold: 0, revenue: 0, cost: 0, profit: 0 });

  const validateInventory = () => {
    const items = stockRows.map((r) => ({
      productId: r.p.id, name: r.p.name, costPrice: r.p.costPrice || 0, price: r.p.price,
      openingStock: r.openingStock, currentStock: r.p.stock, sold: r.sold,
      revenue: r.revenue, cost: r.cost, profit: r.totalProfit,
    }));
    const record = { id: uid(), date: new Date().toISOString(), author, items, totals: stockTotals };
    saveInventories([record, ...inventories]);
    const nowIso = new Date().toISOString();
    saveProducts(products.map((p) => ({ ...p, openingStock: p.stock, openingStockDate: nowIso })));
    pushToast("Inventaire validé — nouveau stock de départ enregistré", "ok");
    setConfirming(false);
  };

  const PERIODS = [
    { id: "all", label: "Tout" },
    { id: "today", label: "Aujourd'hui" },
    { id: "7j", label: "7 jours" },
    { id: "30j", label: "30 jours" },
    { id: "custom", label: "Plage", Icon: CalendarCheck },
  ];

  return (
    <div className="pb-16">
      <div className="flex gap-2 overflow-x-auto gb-scroll mb-3">
        {PERIODS.map((p) => (
          <button key={p.id} onClick={() => setPeriodFilter(p.id)} className="gb-focus shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold" style={{ background: periodFilter === p.id ? "#534AB7" : "var(--card)", color: periodFilter === p.id ? "#fff" : "var(--ink)", border: periodFilter === p.id ? "none" : "1px solid var(--line)" }}>{p.Icon && <p.Icon size={12} />}{p.label}</button>
        ))}
      </div>
      {periodFilter === "custom" && (
        <div className="flex items-center gap-2 mb-4 p-2.5 rounded-xl gb-slide-up" style={{ background: "#EEEDFE" }}>
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="gb-focus flex-1 rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "#AFA9EC", background: "var(--card)" }} />
          <span className="text-xs font-semibold" style={{ color: "#534AB7" }}>à</span>
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="gb-focus flex-1 rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "#AFA9EC", background: "var(--card)" }} />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 mb-5">
        <StatCard icon={Boxes} label="Unités vendues" value={periodTotals.sold} tintBg="#534AB7" tintFg="#fff" />
        <StatCard icon={TrendingUp} label="Chiffre d'affaires" value={fmt(periodTotals.revenue)} tintBg="#E6F1FB" tintFg="#185FA5" />
        <StatCard icon={Wallet} label="Coût total" value={fmt(periodTotals.cost)} tintBg="#FAEEDA" tintFg="#854F0B" />
        <StatCard icon={Layers} label="Bénéfice" value={fmt(periodTotals.profit)} tintBg={periodTotals.profit >= 0 ? "#EAF3DE" : "#FCEBEB"} tintFg={periodTotals.profit >= 0 ? "#27500A" : "#A32D2D"} />
      </div>

      <h3 className="font-display font-bold text-base mb-2">Détail par produit</h3>
      {periodRows.length === 0 && <p className="text-sm opacity-50 text-center py-6 mb-5">Aucune vente sur cette période.</p>}
      <div className="flex flex-col gap-2.5 mb-6">
        {periodRows.map((r) => (
          <div key={r.id} className="rounded-2xl p-3.5" style={{ border: "1px solid var(--line)", background: "var(--card)" }}>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-sm font-semibold flex items-center gap-1.5"><CategoryIcon cat={r.category} categories={categories} size={13} /> {r.name}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center mb-2">
              <div className="min-w-0"><div className="text-[10px] opacity-45">Vendu</div><div className="font-mono text-xs sm:text-sm font-semibold whitespace-nowrap">{r.sold}</div></div>
              <div className="min-w-0"><div className="text-[10px] opacity-45">Chiffre d'affaires</div><div className="font-mono text-xs sm:text-sm font-semibold whitespace-nowrap">{fmt(r.revenue)}</div></div>
              <div className="min-w-0"><div className="text-[10px] opacity-45">Marge</div>
                {r.costMissing && r.cost === 0
                  ? <div className="font-mono text-xs sm:text-sm font-semibold whitespace-nowrap opacity-40">—</div>
                  : <div className="font-mono text-xs sm:text-sm font-semibold whitespace-nowrap" style={{ color: r.profit >= 0 ? "#3B6D11" : "var(--danger)" }}>{r.profit >= 0 ? "+" : ""}{fmt(r.profit)}</div>}
              </div>
            </div>
            {r.costMissing && (
              <p className="text-[11px] font-medium rounded-lg px-2.5 py-1.5" style={{ background: "#FAEEDA", color: "#854F0B" }}>
                Prix d'achat non renseigné{r.cost > 0 ? ` pour ${r.missingCostQty} unité(s)` : ""} — renseigne-le dans Stock pour obtenir la vraie marge.
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-4 mb-2.5" style={{ background: "var(--paper-dim)" }}>
        <h3 className="font-display font-bold text-sm mb-1">Depuis le dernier inventaire</h3>
        <p className="text-[11px] opacity-50 mb-3">Stock de départ + arrivages − ventes = stock actuel, pour chaque produit. Indépendant de la période choisie ci-dessus.</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-xl px-3 py-2" style={{ background: "var(--card)" }}><p className="text-[10px] opacity-50">Unités vendues</p><p className="font-mono font-semibold text-sm">{stockTotals.sold}</p></div>
          <div className="rounded-xl px-3 py-2" style={{ background: "var(--card)" }}><p className="text-[10px] opacity-50">Bénéfice</p><p className="font-mono font-semibold text-sm" style={{ color: stockTotals.profit >= 0 ? "#3B6D11" : "var(--danger)" }}>{fmt(stockTotals.profit)}</p></div>
        </div>
        {(() => {
          const active = stockRows.filter((r) => r.L.sold || r.L.arrived || r.L.adjusted || r.L.ecart);
          if (active.length === 0) return null;
          const cols = "minmax(0,1.5fr) repeat(4, minmax(0,1fr))";
          return (
            <div className="rounded-xl px-3 py-2" style={{ background: "var(--card)" }}>
              <div className="grid gap-1 text-[10px] opacity-50 pb-1.5" style={{ gridTemplateColumns: cols, borderBottom: "1px solid var(--line)" }}>
                <span>Produit</span><span className="text-right">Départ</span><span className="text-right">Arrivé</span><span className="text-right">Vendu</span><span className="text-right">Actuel</span>
              </div>
              {active.map((r) => (
                <div key={r.p.id} className="py-1.5" style={{ borderBottom: "1px solid var(--line)" }}>
                  <div className="grid gap-1 text-xs items-baseline" style={{ gridTemplateColumns: cols }}>
                    <span className="truncate font-semibold">{r.p.name}</span>
                    <span className="text-right font-mono">{r.L.opening}</span>
                    <span className="text-right font-mono" style={{ color: r.L.arrived ? "#3B6D11" : undefined }}>{r.L.arrived ? `+${r.L.arrived}` : "0"}</span>
                    <span className="text-right font-mono" style={{ color: r.L.sold ? "#A32D2D" : undefined }}>{r.L.sold}</span>
                    <span className="text-right font-mono font-bold">{r.L.current}</span>
                  </div>
                  <p className="text-[10px] opacity-45">
                    Départ le {r.L.openingDate ? new Date(r.L.openingDate).toLocaleDateString("fr-FR") : "—"}
                    {r.L.adjusted ? ` · ajustements ${r.L.adjusted > 0 ? "+" : ""}${r.L.adjusted}` : ""}
                  </p>
                  {r.L.ecart !== 0 && <p className="text-[10px] font-medium" style={{ color: "#854F0B" }}>Écart {r.L.ecart > 0 ? "+" : ""}{r.L.ecart} (stock calculé : {r.L.expected})</p>}
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {confirming ? (
        <div className="rounded-2xl p-4 border gb-slide-up" style={{ borderColor: "var(--cap)", background: "var(--paper-dim)" }}>
          <p className="text-xs font-semibold mb-3">Valider l'inventaire ? Cette action enregistre le bénéfice depuis le dernier inventaire dans l'historique et fait du stock actuel le nouveau stock de départ.</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirming(false)} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--card)" }}>Annuler</button>
            <button onClick={validateInventory} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: "var(--glass)" }}>Confirmer</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setConfirming(true)} className="gb-focus w-full rounded-2xl py-3.5 font-semibold text-sm flex items-center justify-center gap-2 text-white" style={{ background: "var(--glass)" }}>
          <ClipboardCheck size={16} /> Valider l'inventaire
        </button>
      )}
    </div>
  );
}

function InventoryHistorySection({ inventories }) {
  const fmt = useFmt();
  const [open, setOpen] = useState(null);
  const sorted = [...inventories].sort((a, b) => new Date(b.date) - new Date(a.date));
  return (
    <div>
      <h3 className="font-display font-bold text-base mb-2">Inventaires validés</h3>
      {sorted.length === 0 && <p className="text-sm opacity-50 text-center py-8">Aucun inventaire validé pour l'instant.</p>}
      <div className="flex flex-col gap-2.5">
        {sorted.map((inv) => {
          const soldItems = inv.items.filter((i) => i.sold !== 0);
          return (
            <div key={inv.id} className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
              <button onClick={() => setOpen(open === inv.id ? null : inv.id)} className="gb-focus w-full flex items-center justify-between p-3.5">
                <div className="text-left">
                  <div className="text-sm font-semibold">{new Date(inv.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</div>
                  <div className="text-xs opacity-50">{inv.author} · {inv.totals.sold} unités vendues</div>
                </div>
                <span className="font-mono font-bold text-sm" style={{ color: inv.totals.profit >= 0 ? "#1CA857" : "var(--danger)" }}>{fmt(inv.totals.profit)}</span>
              </button>
              {open === inv.id && (
                <div className="px-3.5 pb-3.5 pt-1 border-t gb-slide-up" style={{ borderColor: "var(--line)" }}>
                  <div className="flex justify-between text-[11px] opacity-50 py-1">
                    <span>Chiffre d'affaires</span><span className="font-mono">{fmt(inv.totals.revenue)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] opacity-50 py-1 mb-1.5">
                    <span>Coût des ventes</span><span className="font-mono">{fmt(inv.totals.cost)}</span>
                  </div>
                  {soldItems.length === 0 && <p className="text-xs opacity-50 py-2">Aucune vente sur cette période.</p>}
                  {soldItems.map((i) => (
                    <div key={i.productId} className="flex justify-between text-xs font-mono py-0.5 opacity-80">
                      <span>{i.name} ({i.sold})</span><span>{fmt(i.profit)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Versements (clôture de caisse) ---------- */

function toDateInput(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

// ---------- Point de caisse : rapport (écran, ticket, PDF) ----------
// Une session de caisse va de la saisie du fond jusqu'au versement. Toutes
// les ventes en espèces et les crédits encaissés pendant cette période
// s'ajoutent au fond, les dépenses se retirent : on obtient les espèces
// attendues. Le Mobile Money est indiqué à part (il n'est pas dans le tiroir).
function buildCashReport(session, { sales = [], expenses = [], versement = null, printedBy = "" } = {}) {
  if (!session) return null;
  const until = versement ? versement.date : new Date().toISOString();
  const recap = computeCashSession(session, { sales, expenses, until });
  return {
    ...recap,
    sessionId: session.id,
    openedAt: session.timestamp || session.date,
    openedBy: session.setBy || "",
    until,
    versement: versement ? { amount: Number(versement.amount) || 0, by: versement.by || "", receivedBy: versement.receivedBy || "", note: versement.note || "", date: versement.date } : null,
    printedBy,
  };
}

// Détail de la caisse par vendeur (point de caisse, clôture, versements).
function CashByVendor({ list, compact }) {
  const fmt = useFmt();
  const COLORS = ["#0F6E56", "#173F70", "#8A4B00", "#534AB7", "#B3261E", "#1E8E50"];
  const initials = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  return (
    <div className={compact ? "flex flex-col gap-2 mt-3" : "flex flex-col gap-2 mb-3"}>
      {!compact && <p className="text-[12px] font-bold uppercase tracking-wider opacity-60 mt-1">Détail par vendeur</p>}
      {list.map((v, i) => (
        <div key={v.name} className="rounded-2xl p-3.5" style={{ background: "#fff", color: "#16202A", border: "1px solid #E6E4DD" }}>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold shrink-0" style={{ background: COLORS[i % COLORS.length] }}>{initials(v.name)}</div>
            <div className="flex-1 min-w-0"><p className="text-[14.5px] font-bold break-words">{v.name}</p><p className="text-[12px]" style={{ color: "#5B6470" }}>{v.tickets} ticket{v.tickets > 1 ? "s" : ""}</p></div>
            <div className="text-right shrink-0"><p className="text-[11px]" style={{ color: "#5B6470" }}>Espèces à remettre</p><p className="font-mono font-bold text-[14px] whitespace-nowrap">{fmt(v.expectedCash)}</p></div>
          </div>
          <div className="flex flex-col gap-1 text-[13px]">
            <div className="flex justify-between gap-3"><span style={{ color: "#5B6470" }}>Ventes en espèces ({v.cashCount})</span><span className="font-mono whitespace-nowrap">{fmt(v.cash)}</span></div>
            {v.credits > 0 && <div className="flex justify-between gap-3"><span style={{ color: "#5B6470" }}>Crédits encaissés ({v.creditsCount})</span><span className="font-mono whitespace-nowrap">{fmt(v.credits)}</span></div>}
            {v.refunds > 0 && <div className="flex justify-between gap-3"><span style={{ color: "#5B6470" }}>Retours remboursés ({v.refundsCount})</span><span className="font-mono whitespace-nowrap" style={{ color: "#B3261E" }}>−{fmt(v.refunds)}</span></div>}
            {v.expenses > 0 && <div className="flex justify-between gap-3"><span style={{ color: "#5B6470" }}>Dépenses payées</span><span className="font-mono whitespace-nowrap" style={{ color: "#B3261E" }}>−{fmt(v.expenses)}</span></div>}
            <div className="flex justify-between gap-3"><span style={{ color: "#5B6470" }}>Mobile Money ({v.mobileCount})</span><span className="font-mono whitespace-nowrap">{fmt(v.mobile)}</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CashReportModal({ shop, report, onClose, pushToast }) {
  const fmt = useFmt();
  const [busy, setBusy] = useState("");
  if (!report) return null;
  const closed = !!report.versement;
  const gap = closed ? report.versement.amount - report.expected : 0;
  const dt = (d) => new Date(d).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const plain = (v) => String(v).replace(/[\u00A0\u202F]/g, " ").replace(/\u2212/g, "-").replace(/\u2026/g, "...");
  const rows = [
    ["Fond de caisse", fmt(report.fund), null, `Saisi${report.openedBy ? ` par ${report.openedBy}` : ""}`],
    [`Ventes en espèces`, `+ ${fmt(report.cashSales)}`, "#1E8E50", `${report.cashSalesCount} vente${report.cashSalesCount > 1 ? "s" : ""}`],
    [`Crédits encaissés`, `+ ${fmt(report.creditsCollected)}`, "#1E8E50", `${report.creditsCount} règlement${report.creditsCount > 1 ? "s" : ""}`],
    [`Dépenses`, `− ${fmt(report.expensesTotal)}`, "#B3261E", `${report.expensesCount} dépense${report.expensesCount > 1 ? "s" : ""}`],
    ...(Number(report.refundsCash) > 0 ? [[`Remboursements (retours)`, `− ${fmt(report.refundsCash)}`, "#B3261E", `${report.refundsCashCount || 0} retour${(report.refundsCashCount || 0) > 1 ? "s" : ""} remboursé${(report.refundsCashCount || 0) > 1 ? "s" : ""} en espèces`]] : []),
  ];
  const text = [
    `${shop?.name || ""} — ${closed ? "Clôture de caisse" : "Point de caisse"}`,
    `Ouverte le ${dt(report.openedAt)}${report.openedBy ? ` par ${report.openedBy}` : ""}`,
    `${closed ? "Versée le" : "Arrêtée le"} ${dt(report.until)}`,
    "",
    ...rows.map(([l, v, , sub]) => `${l} (${sub}) : ${v}`),
    `Espèces attendues : ${fmt(report.expected)}`,
    ...(closed ? [`Montant versé : ${fmt(report.versement.amount)}`, `Écart : ${gap > 0 ? "+" : ""}${fmt(gap)}`] : []),
    `Mobile Money (hors caisse) : ${fmt(report.mobileSales)}`,
    ...((report.byVendor || []).length ? ["", "Par vendeur :", ...(report.byVendor || []).map((v) => `- ${v.name} : ${v.tickets} ticket(s), espèces à remettre ${fmt(v.expectedCash)}, MoMo ${fmt(v.mobile)}`)] : []),
  ].map(plain).join("\n");

  const doPrint = async () => {
    setBusy("print");
    try { await printCashReport(report, shop, fmt); }
    catch (e) { pushToast?.(e?.message || "Impression impossible", "error"); }
    setBusy("");
  };
  const doPdf = async () => {
    setBusy("pdf");
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const W = 595, L = 60, R = 535;
      let y = 60;
      doc.setFillColor(31, 42, 51); doc.rect(0, 0, W, 110, "F");
      doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(20);
      doc.text(plain(shop?.name || "GestiOne"), L, y);
      doc.setFontSize(12); doc.setFont("helvetica", "normal");
      doc.text(closed ? "Clôture de caisse" : "Point de caisse — caisse ouverte", L, y + 22);
      doc.setFontSize(10);
      doc.text(plain(`Ouverte le ${dt(report.openedAt)}${report.openedBy ? ` par ${report.openedBy}` : ""}`), R, y, { align: "right" });
      doc.text(plain(`${closed ? "Versée le" : "Arrêtée le"} ${dt(report.until)}`), R, y + 16, { align: "right" });
      y = 150;
      doc.setTextColor(22, 32, 42);
      rows.forEach(([l, v, color, sub]) => {
        doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text(l, L, y);
        doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(91, 100, 112); doc.text(plain(sub), L, y + 14);
        const c = color === "#1E8E50" ? [30, 142, 80] : color === "#B3261E" ? [179, 38, 30] : [22, 32, 42];
        doc.setTextColor(...c); doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text(plain(v), R, y + 4, { align: "right" });
        doc.setTextColor(22, 32, 42);
        doc.setDrawColor(230, 228, 221); doc.setLineWidth(0.8); doc.line(L, y + 26, R, y + 26);
        y += 46;
      });
      doc.setFillColor(234, 246, 239); doc.roundedRect(L, y - 4, R - L, 48, 8, 8, "F");
      doc.setTextColor(15, 79, 43); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
      doc.text("ESPÈCES ATTENDUES EN CAISSE", L + 16, y + 26); doc.text(plain(fmt(report.expected)), R - 16, y + 26, { align: "right" });
      y += 72;
      doc.setTextColor(22, 32, 42);
      if (closed) {
        doc.setFontSize(12);
        [["Montant versé", fmt(report.versement.amount)], ["Écart (versé − attendu)", `${gap > 0 ? "+" : ""}${fmt(gap)}`], ["Versé par", report.versement.by || "—"], ["Reçu par", report.versement.receivedBy || "—"]].forEach(([l, v]) => {
          doc.setFont("helvetica", "normal"); doc.text(l, L, y); doc.setFont("helvetica", "bold"); doc.text(plain(v), R, y, { align: "right" }); y += 22;
        });
        if (report.versement.note) { doc.setFont("helvetica", "italic"); doc.setFontSize(10); doc.text(plain(`Note : ${report.versement.note}`), L, y); y += 20; }
        y += 8;
      }
      doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(74, 82, 92);
      doc.text(plain(`Mobile Money encaissé (hors caisse) — ${report.mobileSalesCount} vente${report.mobileSalesCount > 1 ? "s" : ""}`), L, y); doc.text(plain(fmt(report.mobileSales)), R, y, { align: "right" }); y += 20;
      doc.text("Total encaissé sur la période", L, y); doc.text(plain(fmt(report.cashSales + report.creditsCollected + report.mobileSales)), R, y, { align: "right" }); y += 30;
      if ((report.byVendor || []).length) {
        doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(22, 32, 42); doc.text("Détail par vendeur", L, y); y += 16;
        doc.setFontSize(9); doc.setTextColor(91, 100, 112);
        [["Vendeur", L], ["Tickets", L + 150], ["Espèces", L + 250], ["Crédits", L + 330], ["Retours", L + 400], ["À remettre", R]].forEach(([h, x], i) => doc.text(h, x, y, { align: i === 0 ? "left" : "right" }));
        y += 6; doc.setDrawColor(230, 228, 221); doc.line(L, y, R, y); y += 14;
        doc.setFont("helvetica", "normal"); doc.setTextColor(22, 32, 42);
        (report.byVendor || []).forEach((v) => {
          if (y > 740) { doc.addPage(); y = 60; }
          doc.text(plain(v.name).slice(0, 26), L, y); doc.text(String(v.tickets), L + 150, y, { align: "right" }); doc.text(plain(fmt(v.cash)), L + 250, y, { align: "right" }); doc.text(plain(fmt(v.credits)), L + 330, y, { align: "right" }); doc.text(plain(v.refunds ? `-${fmt(v.refunds)}` : "0"), L + 400, y, { align: "right" }); doc.setFont("helvetica", "bold"); doc.text(plain(fmt(v.expectedCash)), R, y, { align: "right" }); doc.setFont("helvetica", "normal");
          y += 16;
        });
        y += 14;
      }
      y = Math.max(y + 20, 700);
      doc.setDrawColor(150); doc.line(L, y, L + 180, y); doc.line(R - 180, y, R, y);
      doc.setFontSize(9); doc.text("Signature du caissier", L, y + 14); doc.text("Signature du gérant", R, y + 14, { align: "right" });
      doc.setFontSize(8); doc.setTextColor(140);
      doc.text(plain(`Imprimé le ${new Date().toLocaleString("fr-FR")}${report.printedBy ? ` par ${report.printedBy}` : ""} · GestiOne`), W / 2, 810, { align: "center" });
      await exportPdfDoc(`${closed ? "cloture" : "point"}_caisse_${new Date(report.until).toISOString().slice(0, 10)}.pdf`, doc);
    } catch { pushToast?.("Impossible de générer le PDF", "error"); }
    setBusy("");
  };

  return (
    <div className="fixed inset-0 z-[97] flex items-end sm:items-center justify-center no-print" style={{ background: "rgba(22,32,42,0.55)", padding: "max(24px, env(safe-area-inset-top)) 0 0" }} onClick={onClose}>
      <div className="w-full max-w-[440px] rounded-t-[26px] sm:rounded-[26px] flex flex-col gb-slide-up" style={{ background: "var(--paper)", maxHeight: "100%", paddingBottom: "max(18px, env(safe-area-inset-bottom))" }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pt-4 pb-3 flex items-center gap-3 shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold uppercase tracking-wider opacity-60">{closed ? "Clôture de caisse" : "Point de caisse"}</p>
            <p className="font-display font-bold text-[19px] leading-tight">{closed ? "Caisse versée" : "Caisse en cours"}</p>
          </div>
          <button onClick={onClose} className="gb-focus w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }} aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto gb-scroll px-5">
          <div className="rounded-[20px] p-4 mb-3" style={{ background: "#fff", color: "#16202A", border: "1px solid #E6E4DD", boxShadow: "0 1px 2px rgba(22,32,42,0.05)" }}>
            <div className="text-center pb-3 mb-2" style={{ borderBottom: "1.5px dashed #D5D2C8" }}>
              <p className="font-display font-bold text-[17px] break-words">{shop?.name}</p>
              <p className="text-[12px] mt-1" style={{ color: "#5B6470" }}>Ouverte le {dt(report.openedAt)}{report.openedBy ? ` par ${report.openedBy}` : ""}</p>
              <p className="text-[12px]" style={{ color: "#5B6470" }}>{closed ? "Versée" : "Arrêtée"} le {dt(report.until)}</p>
            </div>
            {rows.map(([l, v, color, sub]) => (
              <div key={l} className="flex justify-between items-center gap-3 py-2.5" style={{ borderBottom: "1px solid #EFEDE7" }}>
                <div className="min-w-0"><p className="text-[14.5px] font-semibold">{l}</p><p className="text-[12px]" style={{ color: "#5B6470" }}>{sub}</p></div>
                <span className="font-mono font-bold text-[15px] whitespace-nowrap" style={{ color: color || "#16202A" }}>{v}</span>
              </div>
            ))}
            <div className="flex justify-between items-center gap-3 mt-3 px-3.5 py-3 rounded-2xl" style={{ background: "#EAF6EF", color: "#0F4F2B" }}>
              <span className="text-[13.5px] font-bold leading-tight">Espèces attendues en caisse</span>
              <span className="font-display font-bold text-[20px] whitespace-nowrap">{fmt(report.expected)}</span>
            </div>
            {closed && (
              <div className="mt-3 flex flex-col gap-1.5 text-[13.5px]">
                <div className="flex justify-between"><span style={{ color: "#5B6470" }}>Montant versé</span><b className="font-mono">{fmt(report.versement.amount)}</b></div>
                <div className="flex justify-between"><span style={{ color: "#5B6470" }}>Écart</span><b className="font-mono" style={{ color: gap === 0 ? "#1E8E50" : gap < 0 ? "#B3261E" : "#8A4B00" }}>{gap > 0 ? "+" : ""}{fmt(gap)}</b></div>
                {(report.versement.by || report.versement.receivedBy) && <p className="text-[12px]" style={{ color: "#5B6470" }}>{report.versement.by ? `Versé par ${report.versement.by}` : ""}{report.versement.receivedBy ? ` · reçu par ${report.versement.receivedBy}` : ""}</p>}
              </div>
            )}
            <div className="mt-3 pt-3 flex justify-between gap-3 text-[12.5px]" style={{ borderTop: "1.5px dashed #D5D2C8", color: "#4A525C" }}>
              <span>Mobile Money, hors caisse ({report.mobileSalesCount})</span><span className="font-mono font-semibold whitespace-nowrap">{fmt(report.mobileSales)}</span>
            </div>
          </div>
          {(report.byVendor || []).length > 0 && <CashByVendor list={report.byVendor} />}
        </div>
        <div className="px-5 pt-2 grid grid-cols-3 gap-2 shrink-0">
          {isPrinterFeatureAvailable() && (
            <button onClick={doPrint} disabled={!!busy} className="gb-focus min-h-[52px] rounded-2xl text-white text-[13.5px] font-bold flex flex-col items-center justify-center gap-0.5 disabled:opacity-50" style={{ background: "#1F2A33" }}><Printer size={17} />{busy === "print" ? "…" : "Ticket"}</button>
          )}
          <button onClick={doPdf} disabled={!!busy} className="gb-focus min-h-[52px] rounded-2xl text-[13.5px] font-bold flex flex-col items-center justify-center gap-0.5 disabled:opacity-50" style={{ background: "#E6EEFA", color: "#173F70", gridColumn: isPrinterFeatureAvailable() ? "auto" : "span 2" }}><FileText size={17} />{busy === "pdf" ? "…" : "PDF"}</button>
          <button onClick={() => shareText(closed ? "Clôture de caisse" : "Point de caisse", text).catch(() => {})} className="gb-focus min-h-[52px] rounded-2xl text-[13.5px] font-bold flex flex-col items-center justify-center gap-0.5" style={{ background: "#EAF6EF", color: "#0F4F2B" }}><Send size={17} />Partager</button>
        </div>
      </div>
    </div>
  );
}

function VersementsSection({ shop, sales, expenses, vendors, cashRegisterEntries, versements, activeCashSession, onRecordVersement, author, pushToast }) {
  const [showVendors, setShowVendors] = useState(false);
  const fmt = useFmt();
  const shopId = shop?.id;
  const [formOpen, setFormOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [by, setBy] = useState("");
  const [receivedBy, setReceivedBy] = useState(author || "");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const today = toDateInput(new Date());
  const [from, setFrom] = useState(toDateInput(new Date(Date.now() - 6 * MS_DAY)));
  const [to, setTo] = useState(today);
  const [openId, setOpenId] = useState(null);
  const [cashReport, setCashReport] = useState(null);

  const live = activeCashSession ? computeCashSession(activeCashSession, { sales, expenses }) : null;
  const versedNum = Number(amount);
  const liveGap = live && amount !== "" && !isNaN(versedNum) ? versedNum - live.expected : null;

  const submit = () => {
    if (amount === "" || isNaN(versedNum) || versedNum < 0) { setError("Indique un montant versé valide (0 ou plus)."); return; }
    if (!by.trim()) { setError("Indique qui fait le versement."); return; }
    const session = activeCashSession;
    const v = onRecordVersement?.({ amount: versedNum, by, receivedBy, note });
    if (v) {
      setFormOpen(false); setAmount(""); setNote(""); setError("");
      // Le versement clôture la caisse : on propose aussitôt d'imprimer la clôture.
      if (typeof v === "object") setCashReport({ ...buildCashReport(session, { sales, expenses, versement: v, printedBy: author }), fund: Number(v.fund) || 0, cashSales: Number(v.cashSales) || 0, cashSalesCount: v.cashSalesCount || 0, creditsCollected: Number(v.creditsCollected) || 0, creditsCount: v.creditsCount || 0, expensesTotal: Number(v.expensesTotal) || 0, expensesCount: v.expensesCount || 0, mobileSales: Number(v.mobileSales) || 0, mobileSalesCount: v.mobileSalesCount || 0, refundsCash: Number(v.refundsCash) || 0, refundsCashCount: v.refundsCashCount || 0, expected: Number(v.expected) || 0 });
    }
  };

  const fromT = from ? new Date(from + "T00:00:00").getTime() : -Infinity;
  const toT = to ? new Date(to + "T23:59:59").getTime() : Infinity;
  const own = ownCashEntries(versements, shopId).slice().sort((a, b) => cashTime(b.date) - cashTime(a.date));
  const inRange = own.filter((v) => { const t = cashTime(v.date); return t >= fromT && t <= toT; });
  const fundsInRange = ownCashEntries(cashRegisterEntries, shopId).filter((e) => { const t = cashTime(e.timestamp || e.date); return t >= fromT && t <= toT; });
  const totals = inRange.reduce((acc, v) => ({
    versed: acc.versed + (Number(v.amount) || 0),
    expected: acc.expected + (Number(v.expected) || 0),
    gap: acc.gap + (Number(v.gap) || 0),
    mobile: acc.mobile + (Number(v.mobileSales) || 0),
  }), { versed: 0, expected: 0, gap: 0, mobile: 0 });
  const fundsTotal = fundsInRange.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const setQuick = (days) => { setFrom(toDateInput(new Date(Date.now() - days * MS_DAY))); setTo(today); };
  const shiftRange = (dir) => {
    const f = new Date(from + "T00:00:00"); const t = new Date(to + "T00:00:00");
    const span = Math.max(1, Math.round((t - f) / MS_DAY) + 1);
    f.setDate(f.getDate() + dir * span); t.setDate(t.getDate() + dir * span);
    setFrom(toDateInput(f)); setTo(toDateInput(t));
  };

  const Line = ({ label, value, color, strong }) => (
    <div className="flex justify-between text-[13px]" style={{ fontWeight: strong ? 700 : 400 }}>
      <span style={{ opacity: strong ? 1 : 0.6 }}>{label}</span>
      <span className="font-mono" style={{ color }}>{value}</span>
    </div>
  );
  const gapColor = (g) => (g === 0 ? "#3B6D11" : g < 0 ? "#A32D2D" : "#854F0B");
  const vendorNames = Array.from(new Set([author, ...(vendors || []).map((v) => v.name)].filter(Boolean)));

  return (
    <div className="pb-16">
      {/* Caisse en cours */}
      <div className="rounded-2xl p-4 mb-3" style={{ border: "1px solid var(--line)", background: "var(--card)" }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-display font-bold text-sm flex items-center gap-2"><Banknote size={16} color="#3B6D11" /> Caisse en cours</span>
          {activeCashSession
            ? <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: "#EAF3DE", color: "#27500A" }}>OUVERTE</span>
            : <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: "#FAEEDA", color: "#854F0B" }}>FOND À SAISIR</span>}
        </div>
        {activeCashSession && live ? (
          <>
            <p className="text-[11px] opacity-55 mb-3">Ouverte le {fmtDateTime(activeCashSession.timestamp || activeCashSession.date)}{activeCashSession.setBy ? ` par ${activeCashSession.setBy}` : ""} · non versée</p>
            <div className="flex flex-col gap-1.5">
              <Line label="Fond de caisse" value={fmt(live.fund)} />
              <Line label={`+ Ventes en espèces (${live.cashSalesCount})`} value={`+${fmt(live.cashSales)}`} color="#3B6D11" />
              <Line label={`+ Crédits encaissés (${live.creditsCount})`} value={`+${fmt(live.creditsCollected)}`} color="#3B6D11" />
              <Line label={`− Dépenses (${live.expensesCount})`} value={`−${fmt(live.expensesTotal)}`} color="#A32D2D" />
              {live.refundsCash > 0 && <Line label={`− Remboursements retours (${live.refundsCashCount})`} value={`−${fmt(live.refundsCash)}`} color="#A32D2D" />}
              <div className="pt-1.5 mt-0.5" style={{ borderTop: "1px solid var(--line)" }}><Line label="Espèces attendues en caisse" value={fmt(live.expected)} strong /></div>
              <div className="text-[11px] opacity-50 flex justify-between"><span>Mobile Money, hors caisse ({live.mobileSalesCount})</span><span className="font-mono">{fmt(live.mobileSales)}</span></div>
            </div>
            {(live.byVendor || []).length > 0 && (
              <>
                <button onClick={() => setShowVendors(!showVendors)} className="gb-focus w-full mt-3 flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-bold" style={{ background: "var(--paper-dim)" }}>
                  <span className="flex items-center gap-2"><Users size={15} /> Détail par vendeur ({live.byVendor.length})</span>
                  <ChevronDown size={16} style={{ transform: showVendors ? "rotate(180deg)" : "none" }} />
                </button>
                {showVendors && <CashByVendor list={live.byVendor} compact />}
              </>
            )}
            {!formOpen && (
              <div className="grid grid-cols-2 gap-2 mt-3.5">
                <button onClick={() => setCashReport(buildCashReport(activeCashSession, { sales, expenses, printedBy: author }))} className="gb-focus min-h-[46px] rounded-xl text-sm font-bold flex items-center justify-center gap-2" style={{ background: "var(--paper-dim)" }}>
                  <Printer size={16} /> Imprimer
                </button>
                <button onClick={() => { setFormOpen(true); setAmount(String(Math.max(0, live.expected))); setError(""); }} className="gb-focus min-h-[46px] rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2" style={{ background: "var(--glass)" }}>
                  <Wallet size={16} /> Versement
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs opacity-60">Aucune caisse ouverte. Le fond de caisse sera demandé à l'ouverture de l'écran Vendre.</p>
        )}
      </div>

      {/* Formulaire de versement */}
      {formOpen && live && (
        <div className="rounded-2xl p-4 mb-3 gb-slide-up" style={{ border: "1.5px solid var(--cap)", background: "var(--card)" }}>
          <p className="font-display font-bold text-sm mb-3">Nouveau versement</p>
          <label className="text-[11px] font-bold opacity-60 block mb-1">Montant versé ({shop?.currency || "FCFA"})</label>
          <input type="number" min="0" inputMode="numeric" value={amount} onChange={(e) => { setAmount(e.target.value); setError(""); }} className="gb-focus w-full rounded-xl px-3 py-2.5 text-lg font-bold border-2 mb-2.5" style={{ borderColor: "var(--cap)" }} />
          <div className="grid grid-cols-2 gap-2 mb-2.5">
            <div className="min-w-0">
              <label className="text-[11px] font-bold opacity-60 block mb-1">Versé par</label>
              <input list="versement-people" value={by} onChange={(e) => { setBy(e.target.value); setError(""); }} placeholder="Francisca" className="gb-focus w-full rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} />
            </div>
            <div className="min-w-0">
              <label className="text-[11px] font-bold opacity-60 block mb-1">Reçu par</label>
              <input list="versement-people" value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} className="gb-focus w-full rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} />
            </div>
          </div>
          <datalist id="versement-people">{vendorNames.map((n) => <option key={n} value={n} />)}</datalist>
          <label className="text-[11px] font-bold opacity-60 block mb-1">Note (facultatif)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Versement du soir" className="gb-focus w-full rounded-xl px-3 py-2 text-sm border mb-2.5" style={{ borderColor: "var(--line)" }} />
          {liveGap !== null && (
            <div className="flex justify-between rounded-xl px-3 py-2 text-[13px] mb-2.5" style={{ background: liveGap === 0 ? "#EAF3DE" : liveGap < 0 ? "#FCEBEB" : "#FAEEDA", color: gapColor(liveGap) }}>
              <span>Écart (versé − attendu)</span><span className="font-mono font-bold">{liveGap > 0 ? "+" : ""}{fmt(liveGap)}</span>
            </div>
          )}
          {error && <p className="text-[11px] mb-2" style={{ color: "var(--danger)" }}>{error}</p>}
          <p className="text-[11px] opacity-50 mb-3">Après validation, la caisse est clôturée et la fenêtre s'ouvre pour saisir le montant qui reste dans la caisse.</p>
          <div className="flex gap-2">
            <button onClick={() => { setFormOpen(false); setError(""); }} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--paper-dim)" }}>Annuler</button>
            <button onClick={submit} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-bold text-white" style={{ background: "var(--glass)" }}>Valider le versement</button>
          </div>
        </div>
      )}

      {/* Plage de dates */}
      <div className="rounded-2xl p-4 mb-3" style={{ border: "1px solid var(--line)", background: "var(--card)" }}>
        <div className="flex items-center gap-2 mb-2.5">
          <button onClick={() => shiftRange(-1)} aria-label="Période précédente" className="gb-focus w-9 h-9 shrink-0 rounded-full flex items-center justify-center" style={{ background: "var(--paper-dim)" }}><ChevronLeft size={16} /></button>
          <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} aria-label="Du" className="gb-focus flex-1 min-w-0 rounded-xl px-2 py-2 text-xs border" style={{ borderColor: "var(--line)" }} />
          <span className="text-[11px] opacity-50">au</span>
          <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} aria-label="Au" className="gb-focus flex-1 min-w-0 rounded-xl px-2 py-2 text-xs border" style={{ borderColor: "var(--line)" }} />
          <button onClick={() => shiftRange(1)} aria-label="Période suivante" className="gb-focus w-9 h-9 shrink-0 rounded-full flex items-center justify-center" style={{ background: "var(--paper-dim)" }}><ChevronRight size={16} /></button>
        </div>
        <div className="flex gap-1.5 mb-3.5 overflow-x-auto gb-scroll">
          {[["Aujourd'hui", 0], ["7 jours", 6], ["30 jours", 29]].map(([label, d]) => (
            <button key={label} onClick={() => setQuick(d)} className="gb-focus shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold" style={{ background: "var(--paper-dim)" }}>{label}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatCard icon={Wallet} label="Total versé" value={fmt(totals.versed)} tintBg="#EAF3DE" tintFg="#27500A" />
          <StatCard icon={ClipboardCheck} label="Versements" value={inRange.length} tintBg="#E6F1FB" tintFg="#185FA5" />
          <StatCard icon={Banknote} label={`Fonds de caisse (${fundsInRange.length})`} value={fmt(fundsTotal)} tintBg="#FAEEDA" tintFg="#854F0B" />
          <StatCard icon={AlertTriangle} label="Écarts cumulés" value={`${totals.gap > 0 ? "+" : ""}${fmt(totals.gap)}`} tintBg={totals.gap < 0 ? "#FCEBEB" : "#EAF3DE"} tintFg={totals.gap < 0 ? "#A32D2D" : "#27500A"} />
        </div>
      </div>

      {cashReport && <CashReportModal shop={shop} report={cashReport} onClose={() => setCashReport(null)} pushToast={pushToast} />}

      {/* Caisse jour par jour sur la plage choisie */}
      {(() => {
        const days = listCashDays(from || today, to || today)
          .map((day) => ({ day, snap: cashSnapshotForDay(cashRegisterEntries, versements, shopId, day) }))
          .filter((x) => x.snap);
        if (days.length === 0) return null;
        const label = (k) => new Date(k + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
        return (
          <div className="rounded-2xl mb-3 overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>
            <div className="flex items-center justify-between gap-2 px-3.5 pt-3 pb-2">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide" style={{ color: "#854F0B" }}><Banknote size={14} /> Caisse par jour</span>
              <span className="text-[11px] opacity-50">{days.length} jour{days.length > 1 ? "s" : ""}</span>
            </div>
            {days.map(({ day, snap }) => {
              const versed = snap.versedOnOrBefore;
              const detail = snap.carried
                ? `Reporté du ${label(snap.sessionDay)}${snap.setBy ? ` · saisi par ${snap.setBy}` : ""}`
                : `Saisi${snap.setBy ? ` par ${snap.setBy}` : ""}${snap.session.timestamp ? ` à ${new Date(snap.session.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}`;
              return (
                <div key={day} className="flex items-center gap-3 px-3.5 py-2.5 border-t" style={{ borderColor: "var(--line)" }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold capitalize">{day === today ? "Aujourd'hui" : label(day)}</p>
                    <p className="text-[11px] opacity-55 mt-0.5 break-words">{detail}{snap.sessionsThatDay.length > 1 ? ` · ${snap.sessionsThatDay.length} fonds ce jour` : ""}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="font-mono font-bold text-sm">{fmt(snap.amount)}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={versed ? { background: "#EAF3DE", color: "#27500A" } : { background: "#FAEEDA", color: "#854F0B" }}>{versed ? "Versé" : "Non versé"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Historique des versements */}
      <h3 className="font-display font-bold text-base mb-2">Historique des versements</h3>
      {inRange.length === 0 && <p className="text-sm opacity-50 text-center py-6">Aucun versement sur cette période.</p>}
      <div className="flex flex-col gap-2.5">
        {inRange.map((v) => {
          const open = openId === v.id;
          const g = Number(v.gap) || 0;
          return (
            <button type="button" key={v.id} onClick={() => setOpenId(open ? null : v.id)} className="gb-focus w-full text-left rounded-2xl p-3.5" style={{ border: "1px solid var(--line)", background: "var(--card)" }}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-semibold">Versement du {fmtDateTime(v.date)}</span>
                <span className="font-mono font-bold text-sm shrink-0">{fmt(v.amount)}</span>
              </div>
              <p className="text-[11px] opacity-55 mt-0.5">Caisse ouverte le {fmtDateTime(v.openedAt)} · fond {fmt(v.fund)}{v.by ? ` · ${v.by}` : ""}{v.receivedBy ? ` → ${v.receivedBy}` : ""}</p>
              <p className="text-[11px] font-semibold mt-0.5" style={{ color: gapColor(g) }}>Attendu {fmt(v.expected)} · écart {g > 0 ? "+" : ""}{fmt(g)}</p>
              {open && (
                <div className="mt-2.5 pt-2.5 flex flex-col gap-1" style={{ borderTop: "1px solid var(--line)" }}>
                  <Line label="Fond de caisse" value={fmt(v.fund)} />
                  <Line label={`+ Ventes en espèces (${v.cashSalesCount || 0})`} value={`+${fmt(v.cashSales || 0)}`} color="#3B6D11" />
                  <Line label={`+ Crédits encaissés (${v.creditsCount || 0})`} value={`+${fmt(v.creditsCollected || 0)}`} color="#3B6D11" />
                  <Line label={`− Dépenses (${v.expensesCount || 0})`} value={`−${fmt(v.expensesTotal || 0)}`} color="#A32D2D" />
                  {Number(v.refundsCash) > 0 && <Line label={`− Remboursements retours (${v.refundsCashCount || 0})`} value={`−${fmt(v.refundsCash)}`} color="#A32D2D" />}
                  <Line label="Espèces attendues" value={fmt(v.expected)} strong />
                  <Line label="Montant versé" value={fmt(v.amount)} strong />
                  <Line label="Mobile Money (hors caisse)" value={fmt(v.mobileSales || 0)} />
                  {v.note && <p className="text-[11px] opacity-60 mt-1">Note : {v.note}</p>}
                  {v.recordedBy && <p className="text-[11px] opacity-45">Enregistré par {v.recordedBy}</p>}
                  <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); const session = ownCashEntries(cashRegisterEntries, shopId).find((x) => x.id === v.sessionId) || { id: v.sessionId, amount: v.fund, timestamp: v.openedAt, setBy: v.openedBy }; setCashReport({ ...buildCashReport(session, { sales, expenses, versement: v, printedBy: author }), fund: Number(v.fund) || 0, cashSales: Number(v.cashSales) || 0, cashSalesCount: v.cashSalesCount || 0, creditsCollected: Number(v.creditsCollected) || 0, creditsCount: v.creditsCount || 0, expensesTotal: Number(v.expensesTotal) || 0, expensesCount: v.expensesCount || 0, mobileSales: Number(v.mobileSales) || 0, mobileSalesCount: v.mobileSalesCount || 0, refundsCash: Number(v.refundsCash) || 0, refundsCashCount: v.refundsCashCount || 0, expected: Number(v.expected) || 0 }); }} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.click(); }} className="gb-focus mt-2 min-h-[42px] rounded-xl text-[13px] font-bold flex items-center justify-center gap-2" style={{ background: "var(--paper-dim)" }}><Printer size={15} /> Imprimer la clôture</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InventorySection({ shop, expenses, vendors, cashRegisterEntries, versements, activeCashSession, onRecordVersement, products, sales, saveSales, saveProducts, categories, movements, saveMovements, inventories, saveInventories, author, pushToast, pushNotification }) {
  const [tab, setTab] = useState("apercu");
  const TABS = [
    { id: "apercu", label: "Aperçu" },
    { id: "mouvements", label: "Mouvements" },
    { id: "comptage", label: "Comptage" },
    { id: "rentabilite", label: "Rentabilité" },
    { id: "versements", label: "Versements" },
    { id: "historique", label: "Historique" },
  ];
  return (
    <div>
      <div className="flex gap-2 overflow-x-auto gb-scroll mb-4">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className="gb-focus shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold" style={{ background: tab === t.id ? "var(--glass)" : "var(--paper-dim)", color: tab === t.id ? "#fff" : "var(--ink)" }}>{t.label}</button>
        ))}
      </div>
      {tab === "apercu" && <InventoryOverview products={products} categories={categories} movements={movements} />}
      {tab === "mouvements" && <MovementsLedger movements={movements} categories={categories} />}
      {tab === "comptage" && <StockCountSection products={products} saveProducts={saveProducts} movements={movements} saveMovements={saveMovements} categories={categories} author={author} pushToast={pushToast} pushNotification={pushNotification} />}
      {tab === "rentabilite" && <ProfitabilitySection products={products} sales={sales} saveSales={saveSales} movements={movements} saveProducts={saveProducts} inventories={inventories} saveInventories={saveInventories} categories={categories} author={author} pushToast={pushToast} />}
      {tab === "versements" && <VersementsSection shop={shop} sales={sales || []} expenses={expenses || []} vendors={vendors || []} cashRegisterEntries={cashRegisterEntries || []} versements={versements || []} activeCashSession={activeCashSession} onRecordVersement={onRecordVersement} author={author} pushToast={pushToast} />}
      {tab === "historique" && <InventoryHistorySection inventories={inventories} />}
    </div>
  );
}

const CRATE_SIZES = [12, 16, 20, 24];
const SUPPLIER_CARD_GRADIENTS = [
  ["#175943", "#0E3B2A"],
  ["#993C1D", "#4A1B0C"],
  ["#534AB7", "#26215C"],
  ["#185FA5", "#042C53"],
  ["#993556", "#4B1528"],
  ["#854F0B", "#412402"],
];

function SupplierProductForm({ initial, products, categories, saveCategories, onSave, onCancel, pushToast }) {
  const symbol = useCurrencySymbol();
  const [name, setName] = useState(initial?.productName || "");
  const [barcode, setBarcode] = useState(initial?.barcode || "");
  const [scannerOpen, setScannerOpen] = useState(false);
  const initialCategoryLabel = categories.find((c) => c.id === initial?.category)?.label || "";
  const [categoryInput, setCategoryInput] = useState(initialCategoryLabel);
  const [crateSize, setCrateSize] = useState(initial?.crateSize || 12);
  const [customSize, setCustomSize] = useState(!CRATE_SIZES.includes(initial?.crateSize) && !!initial);
  const [cratePrice, setCratePrice] = useState(initial?.cratePrice ?? "");
  const [salePrice, setSalePrice] = useState(initial?.salePrice ?? "");

  const resolveCategoryId = () => {
    const label = categoryInput.trim();
    if (!label) return categories[0]?.id || "";
    const existing = categories.find((c) => c.label.trim().toLowerCase() === label.toLowerCase());
    if (existing) return existing.id;
    const id = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || uid();
    saveCategories([...categories, { id, label, icon: "beer", color: COLOR_OPTIONS[0] }]);
    return id;
  };

  const save = () => {
    if (!name.trim() || !cratePrice) return;
    const match = products.find((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase());
    onSave({
      id: initial?.id || uid(),
      productId: match ? match.id : initial?.productId || null,
      productName: name.trim(),
      barcode: barcode.trim(),
      category: resolveCategoryId(),
      crateSize: Number(crateSize) || 1,
      cratePrice: Number(cratePrice) || 0,
      salePrice: Number(salePrice) || 0,
    });
  };

  return (
    <div className="rounded-2xl border p-4 mb-3 gb-slide-up" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
      {scannerOpen && (
        <CameraScanner
          onDetect={(code) => { setBarcode(code); setScannerOpen(false); pushToast?.("Code-barre scanné", "ok"); }}
          onClose={() => setScannerOpen(false)}
        />
      )}
      <div className="flex flex-col gap-2.5">
        <input
          className="gb-focus rounded-xl px-3 py-2 text-sm border"
          style={{ borderColor: "var(--line)" }}
          placeholder="Nom du produit (ex : Régab 65cl)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          list="supplier-product-suggestions"
          autoFocus
        />
        <datalist id="supplier-product-suggestions">
          {products.map((p) => <option key={p.id} value={p.name} />)}
        </datalist>
        {(() => {
          const trimmed = name.trim();
          if (!trimmed) return null;
          const matched = products.some((p) => p.name.trim().toLowerCase() === trimmed.toLowerCase());
          return matched ? (
            <p className="text-[11px] flex items-center gap-1" style={{ color: "#27500A" }}><Check size={12} /> Lié au produit du catalogue — son coût sera mis à jour automatiquement.</p>
          ) : (
            <p className="text-[11px] flex items-center gap-1" style={{ color: "#854F0B" }}><AlertTriangle size={12} /> Aucun produit du catalogue ne s'appelle exactement "{trimmed}" — le coût ne sera pas répercuté sur une fiche produit. Choisissez un nom dans la liste, ou vérifiez l'orthographe exacte dans Stock.</p>
          );
        })()}
        <div className="flex items-center gap-2">
          <input
            className="gb-focus flex-1 rounded-xl px-3 py-2 text-sm border font-mono min-w-0"
            style={{ borderColor: "var(--line)" }}
            placeholder="Code-barre (optionnel)"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
          />
          <button onClick={() => setScannerOpen(true)} className="gb-focus w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--glass)" }} aria-label="Scanner le code-barre">
            <Camera size={15} color="var(--cap)" />
          </button>
        </div>
        <input
          className="gb-focus rounded-xl px-3 py-2 text-sm border"
          style={{ borderColor: "var(--line)" }}
          placeholder="Catégorie (existante ou nouvelle)"
          value={categoryInput}
          onChange={(e) => setCategoryInput(e.target.value)}
          list="supplier-category-suggestions"
        />
        <datalist id="supplier-category-suggestions">
          {categories.map((c) => <option key={c.id} value={c.label} />)}
        </datalist>
        <div className="flex gap-2 flex-wrap">
          {CRATE_SIZES.map((n) => (
            <button key={n} onClick={() => { setCrateSize(n); setCustomSize(false); }} className="gb-focus px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: !customSize && crateSize === n ? "var(--glass)" : "var(--paper-dim)", color: !customSize && crateSize === n ? "#fff" : "var(--ink)" }}>
              Casier de {n}
            </button>
          ))}
          <button onClick={() => setCustomSize(true)} className="gb-focus px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: customSize ? "var(--glass)" : "var(--paper-dim)", color: customSize ? "#fff" : "var(--ink)" }}>Autre</button>
        </div>
        {customSize && (
          <input type="number" min="1" className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder="Bouteilles par casier" value={crateSize} onChange={(e) => setCrateSize(e.target.value)} />
        )}
        <input type="number" min="0" className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder={`Prix du casier (${symbol})`} value={cratePrice} onChange={(e) => setCratePrice(e.target.value)} />
        <input type="number" min="0" className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder={`Prix de vente par bouteille (${symbol})`} value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={onCancel} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--paper-dim)" }}>Annuler</button>
        <button onClick={save} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: "var(--glass)" }}>Enregistrer</button>
      </div>
    </div>
  );
}

function SupplierProductCard({ sp, gradient, fmt, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const unitCost = sp.crateSize > 0 ? Math.round(sp.cratePrice / sp.crateSize) : 0;
  const benefit = (sp.salePrice || 0) - unitCost;
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}>
      <button onClick={() => setOpen((v) => !v)} className="gb-focus w-full flex items-center justify-between p-3.5 text-left">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-white truncate">{sp.productName}</p>
          {!open && <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.75)" }}>{sp.crateSize} bouteilles · {fmt(sp.cratePrice)} le casier</p>}
        </div>
        <div className="flex items-center gap-2.5 shrink-0 ml-2">
          {open && (
            <>
              <span onClick={(e) => { e.stopPropagation(); onEdit(); }} className="gb-focus" role="button" aria-label="Modifier"><Pencil size={14} color="rgba(255,255,255,0.85)" /></span>
              <span onClick={(e) => { e.stopPropagation(); onDelete(); }} className="gb-focus" role="button" aria-label="Supprimer"><Trash2 size={14} color="rgba(255,255,255,0.85)" /></span>
            </>
          )}
          {open ? <ChevronDown size={18} color="#fff" style={{ transform: "rotate(180deg)" }} /> : <ChevronDown size={18} color="#fff" />}
        </div>
      </button>
      {open && (
        <div className="px-3.5 pb-3.5 gb-slide-up">
          <div className="flex gap-2 mb-2.5">
            <div className="flex-1 rounded-xl px-2.5 py-2" style={{ background: "rgba(255,255,255,0.14)" }}>
              <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.7)" }}>Quantité par casier</p>
              <p className="text-sm font-mono font-semibold mt-0.5 text-white">{sp.crateSize} bouteilles</p>
            </div>
            <div className="flex-1 rounded-xl px-2.5 py-2" style={{ background: "rgba(255,255,255,0.14)" }}>
              <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.7)" }}>Prix du casier</p>
              <p className="text-sm font-mono font-semibold mt-0.5 text-white">{fmt(sp.cratePrice)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.25)" }}>
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.75)" }}>Coût par bouteille</span>
            <span className="font-mono text-xs font-semibold text-white">{fmt(unitCost)}</span>
          </div>
          {sp.salePrice > 0 && (
            <>
              <div className="flex items-center justify-between pt-2 mt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.25)" }}>
                <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.75)" }}>Prix de vente</span>
                <span className="font-mono text-xs font-semibold text-white">{fmt(sp.salePrice)}</span>
              </div>
              <div className="flex items-center justify-between mt-2.5 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.16)" }}>
                <span className="text-[11px] font-semibold text-white">Bénéfice par bouteille</span>
                <span className="font-mono text-sm font-semibold text-white">{benefit >= 0 ? "+" : ""}{fmt(benefit)}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SupplierProductsModal({ supplier, products, categories, saveCategories, supplierProducts, onSave, onDelete, onClose, pushToast }) {
  const fmt = useFmt();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const list = supplierProducts.filter((sp) => sp.supplierId === supplier.id);
  const filtered = query.trim() ? list.filter((sp) => sp.productName.toLowerCase().includes(query.trim().toLowerCase())) : list;

  const save = (entry) => { onSave({ ...entry, supplierId: supplier.id }); setAdding(false); setEditing(null); };

  return (
    <div className="fixed inset-0 z-[90] flex no-print">
      <div className="relative w-full h-full flex flex-col" style={{ background: "var(--card)" }}>
        <div className="shrink-0 px-5 pb-3" style={{ borderBottom: "1px solid var(--line)", paddingTop: "max(20px, env(safe-area-inset-top))" }}>
          <div className="flex items-start justify-between gap-3 mb-1">
            <h2 className="font-display font-bold text-lg min-w-0">Produits — {supplier.name}</h2>
            <button onClick={onClose} className="gb-focus p-1 shrink-0"><X size={20} /></button>
          </div>
          <p className="text-xs opacity-50 mb-3">Prix par casier, tel que vendu par ce fournisseur.</p>
          {showSearch && (
            <div className="relative mb-2.5">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher le produit à éditer"
                className="gb-focus w-full rounded-xl pl-9 pr-3 py-2 text-sm border"
                style={{ borderColor: "var(--line)" }}
                autoFocus
              />
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => { setAdding(true); setEditing(null); setShowSearch(false); setQuery(""); }} className="gb-focus flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: "var(--glass)" }}><Plus size={15} /> Lier un produit</button>
            <button onClick={() => { setAdding(false); setShowSearch(true); }} className="gb-focus flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--paper-dim)" }}><Pencil size={14} /> Éditer un produit</button>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto gb-scroll p-5 pt-3">
          {adding && <SupplierProductForm products={products} categories={categories} saveCategories={saveCategories} onSave={save} onCancel={() => setAdding(false)} pushToast={pushToast} />}
          <div className="flex flex-col gap-2.5">
            {filtered.map((sp, idx) => editing === sp.id ? (
              <SupplierProductForm key={sp.id} initial={sp} products={products} categories={categories} saveCategories={saveCategories} onSave={save} onCancel={() => setEditing(null)} pushToast={pushToast} />
            ) : (
              <SupplierProductCard
                key={sp.id}
                sp={sp}
                gradient={SUPPLIER_CARD_GRADIENTS[idx % SUPPLIER_CARD_GRADIENTS.length]}
                fmt={fmt}
                onEdit={() => { setEditing(sp.id); setAdding(false); }}
                onDelete={() => onDelete(sp.id)}
              />
            ))}
            {filtered.length === 0 && !adding && (
              <p className="text-xs opacity-50 text-center py-6">{query.trim() ? "Aucun produit ne correspond à la recherche." : "Aucun produit lié à ce fournisseur pour l'instant."}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PurchaseOrderModal({ supplier, supplierProducts, onCreate, onClose }) {
  const fmt = useFmt();
  const catalog = supplierProducts.filter((sp) => sp.supplierId === supplier.id);
  const [crates, setCrates] = useState({});
  const [query, setQuery] = useState("");
  const setQty = (id, n) => setCrates((s) => { const next = { ...s, [id]: Math.max(0, Number(n) || 0) }; if (next[id] === 0) delete next[id]; return next; });
  const filteredCatalog = query.trim() ? catalog.filter((sp) => sp.productName.toLowerCase().includes(query.trim().toLowerCase())) : catalog;

  const lineItems = Object.entries(crates).map(([id, n]) => {
    const sp = catalog.find((x) => x.id === id);
    return sp ? { productId: sp.productId, productName: sp.productName, barcode: sp.barcode || "", category: sp.category || "", crateSize: sp.crateSize, cratePrice: sp.cratePrice, salePrice: sp.salePrice || 0, crates: n } : null;
  }).filter(Boolean);
  const total = lineItems.reduce((sum, l) => sum + l.crates * l.cratePrice, 0);
  const lines = lineItems.map((l) => `- ${l.productName} : ${l.crates} casier${l.crates > 1 ? "s" : ""} de ${l.crateSize} (${fmt(l.crates * l.cratePrice)})`);
  const text = `Bon de commande — ${supplier.name}\n${new Date().toLocaleDateString("fr-FR")}\n\n${lines.join("\n")}\n\nTotal : ${fmt(total)}`;

  const copyText = async () => {
    try { await navigator.clipboard.writeText(text); } catch { /* presse-papier indisponible */ }
  };
  const waLink = `https://wa.me/${(supplier.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;

  const create = () => {
    if (lineItems.length === 0) return;
    onCreate({ id: uid(), supplierId: supplier.id, date: new Date().toISOString(), status: "pending", items: lineItems });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end no-print">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full rounded-t-3xl gb-slide-up max-h-[85vh] flex flex-col" style={{ background: "var(--card)" }}>
        <div className="shrink-0 px-5 pt-5 pb-3" style={{ borderBottom: "1px solid var(--line)" }}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display font-bold text-lg">Bon de commande — {supplier.name}</h2>
            <button onClick={onClose} className="gb-focus p-1"><X size={20} /></button>
          </div>
          {catalog.length > 0 && (
            <>
              <p className="text-xs opacity-50 mb-3">Indique le nombre de casiers à commander pour chaque produit.</p>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher un produit"
                  className="gb-focus w-full rounded-xl pl-9 pr-3 py-2 text-sm border"
                  style={{ borderColor: "var(--line)" }}
                />
              </div>
            </>
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto gb-scroll p-5 pt-3">
          {catalog.length === 0 ? (
            <p className="text-sm opacity-60 text-center py-6">Aucun produit configuré pour ce fournisseur. Utilise "Liste des produits" pour en ajouter d'abord.</p>
          ) : (
            <>
              <div className="flex flex-col gap-2 mb-4">
                {filteredCatalog.map((sp) => (
                  <div key={sp.id} className="rounded-xl p-2.5 border flex items-center gap-2.5" style={{ borderColor: crates[sp.id] > 0 ? "var(--glass)" : "var(--line)" }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{sp.productName}</div>
                      <div className="text-[10px] opacity-50">Casier de {sp.crateSize} · {fmt(sp.cratePrice)}{crates[sp.id] > 0 ? ` · ${fmt(sp.cratePrice * crates[sp.id])}` : ""}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => setQty(sp.id, (crates[sp.id] || 0) - 1)} className="gb-focus w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--paper-dim)" }}><Minus size={13} /></button>
                      <span className="w-6 text-center text-sm font-mono">{crates[sp.id] || 0}</span>
                      <button onClick={() => setQty(sp.id, (crates[sp.id] || 0) + 1)} className="gb-focus w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--paper-dim)" }}><Plus size={13} /></button>
                    </div>
                  </div>
                ))}
                {filteredCatalog.length === 0 && <p className="text-xs opacity-50 text-center py-6">Aucun produit ne correspond à la recherche.</p>}
              </div>
              <div className="flex justify-between items-center mb-3 px-1">
                <span className="text-sm opacity-60">Total</span>
                <span className="font-mono font-bold text-lg" style={{ color: "var(--glass)" }}>{fmt(total)}</span>
              </div>
              <div className="rounded-xl p-3 mb-4 font-mono text-[11px] whitespace-pre-wrap" style={{ background: "var(--paper-dim)" }}>{text}</div>
              <button onClick={create} disabled={lineItems.length === 0} className="gb-focus w-full rounded-xl py-3 text-sm font-semibold text-white mb-2 disabled:opacity-40" style={{ background: "var(--glass)" }}>Enregistrer la commande</button>
              <div className="flex gap-2">
                <button onClick={copyText} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--paper-dim)" }}>Copier le texte</button>
                <a href={waLink} target="_blank" rel="noopener noreferrer" className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold text-white text-center" style={{ background: "#25D366" }}>Envoyer par WhatsApp</a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function orderTotalOf(o) {
  if (!o) return 0;
  if (o.status === "received" && Number(o.total) > 0) return Number(o.total);
  return (o.items || []).reduce((sum, i) => sum + (Number(i.crates) || 0) * (Number(i.cratePrice) || 0), 0);
}

function PendingOrderModal({ order, supplier, supplierProducts = [], onUpdate, onValidate, onDelete, onClose, pushToast }) {
  const fmt = useFmt();
  const [items, setItems] = useState(order.items.map((i) => ({ ...i })));
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const catalog = supplierProducts.filter((sp) => sp.supplierId === order.supplierId);
  const originalTotal = order.items.reduce((sum, i) => sum + i.crates * i.cratePrice, 0);
  const total = items.reduce((sum, i) => sum + i.crates * i.cratePrice, 0);
  const totalCrates = items.reduce((sum, i) => sum + i.crates, 0);
  const dirty = JSON.stringify(items) !== JSON.stringify(order.items);
  const keyOf = (i) => i.productId || i.productName;
  const setCrates = (idx, n) => setItems((prev) => prev.map((it, k) => (k === idx ? { ...it, crates: Math.max(1, n) } : it)));
  const removeLine = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const addFromCatalog = (sp) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => keyOf(i) === (sp.productId || sp.productName));
      if (idx >= 0) return prev.map((it, k) => (k === idx ? { ...it, crates: it.crates + 1 } : it));
      return [...prev, { productId: sp.productId, productName: sp.productName, barcode: sp.barcode || "", category: sp.category || "", crateSize: sp.crateSize, cratePrice: sp.cratePrice, salePrice: sp.salePrice || 0, crates: 1 }];
    });
  };
  const qtyInOrder = (sp) => items.find((i) => keyOf(i) === (sp.productId || sp.productName))?.crates || 0;
  const filtered = query.trim() ? catalog.filter((sp) => sp.productName.toLowerCase().includes(query.trim().toLowerCase())) : catalog;

  const save = () => {
    if (items.length === 0) { pushToast("La commande est vide : ajoute un produit ou supprime la commande", "error"); return; }
    onUpdate({ ...order, items }); onClose();
  };
  const validate = () => {
    if (items.length === 0) { pushToast("Ajoute au moins un produit disponible avant de valider", "error"); return; }
    onValidate({ ...order, items });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[95] flex flex-col no-print" style={{ background: "#F4F3EF", color: "#16202A" }}>
      <div className="shrink-0 px-5 pb-3 flex items-center gap-3" style={{ paddingTop: "max(22px, env(safe-area-inset-top))" }}>
        <button onClick={onClose} className="gb-focus w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#fff", border: "1px solid #E2E0D9" }} aria-label="Retour"><ChevronLeft size={19} /></button>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "#5B6470" }}>Commande N° {order.id.slice(0, 6).toUpperCase()}</p>
          <p className="font-display font-bold text-[19px] leading-tight break-words">{supplier?.name || "Fournisseur"}</p>
        </div>
        <button onClick={() => setConfirmDelete(true)} className="gb-focus w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#fff", border: "1px solid #F1C9C3" }} aria-label="Supprimer la commande"><Trash2 size={18} color="#B3261E" /></button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto gb-scroll px-5 pb-6 flex flex-col gap-3.5">
        <section className="rounded-[20px] p-4 flex flex-col gap-3 text-white" style={{ background: "#1F2A33" }}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px]" style={{ color: "#C9D1D8" }}>Montant de la commande</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-bold" style={{ background: "#FFF1D6", color: "#7A4E00" }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: "#E09A1A" }} />En attente</span>
          </div>
          <span className="font-display font-bold text-[32px] leading-none">{fmt(total)}</span>
          <div className="flex justify-between gap-2 flex-wrap text-[13px]" style={{ color: "#C9D1D8" }}>
            <span>Commandée le {new Date(order.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
            <span>{totalCrates} casier{totalCrates > 1 ? "s" : ""}</span>
          </div>
          {dirty && (
            <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-[12.5px]" style={{ background: "rgba(255,194,102,0.14)", color: "#FFD699" }}>
              <AlertTriangle size={14} className="shrink-0" /> Modifications non enregistrées · avant : {fmt(originalTotal)}
            </div>
          )}
        </section>

        <section className="rounded-[20px] px-4 pt-1.5 pb-4 flex flex-col" style={{ background: "#fff", border: "1px solid #E6E4DD" }}>
          <div className="flex justify-between items-center gap-2 pt-3 pb-1.5">
            <span className="text-[12px] font-bold uppercase tracking-wide" style={{ color: "#5B6470" }}>Produits ({items.length})</span>
            <span className="text-[12px]" style={{ color: "#5B6470" }}>Touchez − / + pour ajuster</span>
          </div>
          {items.length === 0 && <p className="py-5 text-center text-[13.5px] border-t" style={{ color: "#5B6470", borderColor: "#EFEDE7" }}>La commande est vide. Ajoute au moins un produit ou supprime la commande.</p>}
          {items.map((i, idx) => (
            <div key={keyOf(i) + idx} className="flex flex-col gap-2.5 py-3.5 border-t" style={{ borderColor: "#EFEDE7" }}>
              <div className="flex justify-between items-start gap-2.5">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold break-words">{i.productName}</p>
                  <p className="text-[12.5px]" style={{ color: "#5B6470" }}>Casier de {i.crateSize} · {fmt(i.cratePrice)} / casier</p>
                </div>
                <button onClick={() => removeLine(idx)} className="gb-focus w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: "#F7F6F2" }} aria-label={`Retirer ${i.productName}`}><X size={16} color="#B3261E" /></button>
              </div>
              <div className="flex justify-between items-center gap-2">
                <div className="flex items-center rounded-xl overflow-hidden" style={{ border: "1px solid #DAD8D0", background: "#FAFAF7" }}>
                  <button onClick={() => setCrates(idx, i.crates - 1)} disabled={i.crates <= 1} className="gb-focus w-11 h-10 flex items-center justify-center disabled:opacity-30" aria-label="Diminuer"><Minus size={16} /></button>
                  <span className="min-w-[44px] text-center font-display font-bold text-[16px]">{i.crates}</span>
                  <button onClick={() => setCrates(idx, i.crates + 1)} className="gb-focus w-11 h-10 flex items-center justify-center" aria-label="Augmenter"><Plus size={16} /></button>
                </div>
                <span className="font-display font-bold text-[16px] whitespace-nowrap">{fmt(i.crates * i.cratePrice)}</span>
              </div>
            </div>
          ))}
          <button onClick={() => { setAdding(true); setQuery(""); }} className="gb-focus mt-1.5 min-h-[50px] rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2" style={{ border: "1.5px dashed #9AA3AD", background: "#FAFAF7", color: "#1F2A33" }}>
            <Plus size={18} /> Ajouter des produits
          </button>
        </section>
      </div>

      <div className="shrink-0 px-5 pt-4 flex flex-col gap-2.5" style={{ background: "#fff", borderTop: "1px solid #E6E4DD", paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>
        <div className="grid grid-cols-2 gap-2.5">
          <button onClick={() => setConfirmDelete(true)} className="gb-focus min-h-[50px] rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2" style={{ border: "1px solid #E3B3AC", color: "#9B2C1F", background: "#fff" }}><Trash2 size={17} /> Supprimer</button>
          <button onClick={save} disabled={!dirty || items.length === 0} className="gb-focus min-h-[50px] rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: dirty && items.length ? "#1F2A33" : "#D9DCDF", color: dirty && items.length ? "#fff" : "#4A525C" }}><Check size={17} /> Enregistrer</button>
        </div>
        <button onClick={validate} className="gb-focus min-h-[46px] rounded-xl text-[14px] font-bold" style={{ background: "#E6F2D9", color: "#3A6410" }}>Valider — payée et reçue (entrée en stock)</button>
      </div>

      {adding && (
        <div className="fixed inset-0 z-[96] flex flex-col justify-end" style={{ background: "rgba(22,32,42,0.45)" }}>
          <button className="flex-1" onClick={() => setAdding(false)} aria-label="Fermer" />
          <div className="rounded-t-3xl px-5 pt-2.5 flex flex-col gap-3" style={{ background: "#fff", maxHeight: "80vh", paddingBottom: "max(22px, env(safe-area-inset-bottom))" }}>
            <div className="w-10 h-1 rounded-full self-center" style={{ background: "#D5D2C8" }} />
            <div className="flex justify-between items-center gap-2">
              <span className="font-display font-bold text-[19px]">Ajouter des produits</span>
              <button onClick={() => setAdding(false)} className="gb-focus min-h-[40px] px-3.5 rounded-xl text-white text-[14px] font-bold" style={{ background: "#1F2A33" }}>Terminé</button>
            </div>
            <label className="flex items-center gap-2 min-h-[46px] px-3 rounded-xl border" style={{ borderColor: "#DAD8D0", background: "#FAFAF7" }}>
              <Search size={17} color="#5B6470" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Rechercher un produit ${supplier?.name || ""}`} className="flex-1 min-w-0 bg-transparent outline-none text-[15px]" />
            </label>
            <div className="overflow-y-auto gb-scroll -mx-1 px-1">
              {catalog.length === 0 && <p className="text-[13.5px] text-center py-6" style={{ color: "#5B6470" }}>Aucun produit configuré pour ce fournisseur. Ajoute-les d'abord dans « Liste des produits ».</p>}
              {filtered.map((sp) => {
                const n = qtyInOrder(sp);
                return (
                  <div key={sp.id} className="flex items-center gap-3 py-3 border-b" style={{ borderColor: "#EFEDE7" }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold break-words">{sp.productName}</p>
                      <p className="text-[12.5px]" style={{ color: "#5B6470" }}>Casier de {sp.crateSize} · {fmt(sp.cratePrice)}{n ? ` · ${n} dans la commande` : ""}</p>
                    </div>
                    <button onClick={() => addFromCatalog(sp)} className="gb-focus min-h-[38px] px-3 rounded-[10px] text-[13.5px] font-bold flex items-center gap-1.5 shrink-0" style={n ? { background: "#1F2A33", color: "#fff" } : { border: "1px solid #1F2A33", color: "#1F2A33", background: "#fff" }}><Plus size={15} />{n ? n : "Ajouter"}</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[97] flex items-center justify-center p-6" style={{ background: "rgba(22,32,42,0.55)" }}>
          <div role="dialog" aria-modal="true" className="w-full max-w-[380px] rounded-[22px] p-5 flex flex-col gap-3" style={{ background: "#fff" }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#FBE4E1" }}><Trash2 size={22} color="#9B2C1F" /></div>
            <h2 className="font-display font-bold text-[20px]">Supprimer la commande ?</h2>
            <p className="text-[14px] leading-relaxed" style={{ color: "#5B6470" }}>La commande N° {order.id.slice(0, 6).toUpperCase()} ({fmt(total)}, {totalCrates} casier{totalCrates > 1 ? "s" : ""}) sera supprimée définitivement. Aucun stock n'est modifié.</p>
            <div className="grid grid-cols-2 gap-2.5 mt-1">
              <button onClick={() => setConfirmDelete(false)} className="gb-focus min-h-[48px] rounded-2xl text-[15px] font-bold" style={{ border: "1px solid #DAD8D0" }}>Annuler</button>
              <button onClick={() => { onDelete?.(order); onClose(); }} className="gb-focus min-h-[48px] rounded-2xl text-[15px] font-bold text-white" style={{ background: "#B3261E" }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReceivedOrderModal({ order, supplier, onClose }) {
  const fmt = useFmt();
  const total = order.items.reduce((sum, i) => sum + i.crates * i.cratePrice, 0);
  return (
    <div className="fixed inset-0 z-50 flex items-end no-print">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full rounded-t-3xl p-5 gb-slide-up max-h-[85vh] flex flex-col" style={{ background: "var(--card)", paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>
        <div className="flex items-center justify-between mb-1 shrink-0">
          <h2 className="font-display font-bold text-lg">Commande reçue</h2>
          <button onClick={onClose} className="gb-focus p-1"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto gb-scroll -mx-1 px-1">
          <p className="text-xs opacity-50 mb-4">{supplier?.name} · N° {order.id.slice(0, 6).toUpperCase()} · commandée le {new Date(order.date).toLocaleDateString("fr-FR")}{order.receivedDate ? ` · reçue le ${new Date(order.receivedDate).toLocaleDateString("fr-FR")}` : ""}</p>
          <div className="flex flex-col gap-2 mb-4">
            {order.items.map((i, idx) => (
              <div key={idx} className="rounded-xl p-2.5 border flex items-center justify-between" style={{ borderColor: "var(--line)" }}>
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">{i.productName}</div>
                  <div className="text-[10px] opacity-50">{i.crates} casier{i.crates > 1 ? "s" : ""} de {i.crateSize}</div>
                </div>
                <span className="font-mono text-xs font-semibold shrink-0">{fmt(i.crates * i.cratePrice)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center px-1">
            <span className="text-sm opacity-60">Total payé</span>
            <span className="font-mono font-bold text-lg" style={{ color: "var(--glass)" }}>{fmt(total)}</span>
          </div>
          <ReceiptCodes id={order.id} label={`N° ${order.id.slice(0, 6).toUpperCase()}`} />
        </div>
      </div>
    </div>
  );
}

function SupplierOrdersModal({ supplier, ordersForSupplier, onNewOrder, onOpenOrder, onClose }) {
  const fmt = useFmt();
  const todayKey = cashDayKeyOf(new Date());
  const shiftKey = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return cashDayKeyOf(d); };
  const [preset, setPreset] = useState("30j");
  const [from, setFrom] = useState(shiftKey(29));
  const [to, setTo] = useState(todayKey);
  const [status, setStatus] = useState("all");
  const applyPreset = (k) => {
    setPreset(k);
    const now = new Date();
    if (k === "today") { setFrom(todayKey); setTo(todayKey); }
    if (k === "7j") { setFrom(shiftKey(6)); setTo(todayKey); }
    if (k === "30j") { setFrom(shiftKey(29)); setTo(todayKey); }
    if (k === "mois") { setFrom(cashDayKeyOf(new Date(now.getFullYear(), now.getMonth(), 1))); setTo(todayKey); }
    if (k === "mprec") { setFrom(cashDayKeyOf(new Date(now.getFullYear(), now.getMonth() - 1, 1))); setTo(cashDayKeyOf(new Date(now.getFullYear(), now.getMonth(), 0))); }
    if (k === "annee") { setFrom(`${now.getFullYear()}-01-01`); setTo(todayKey); }
    if (k === "tout") { setFrom("2000-01-01"); setTo(todayKey); }
  };
  const all = [...ordersForSupplier].sort((a, b) => new Date(b.date) - new Date(a.date));
  const inRange = all.filter((o) => { const k = cashDayKeyOf(o.date); return k >= from && k <= to; });
  const shown = inRange.filter((o) => status === "all" || (status === "received" ? o.status === "received" : o.status !== "received"));
  const total = inRange.reduce((sum, o) => sum + orderTotalOf(o), 0);
  const nReceived = inRange.filter((o) => o.status === "received").length;
  const nPending = inRange.length - nReceived;
  const shortDate = (k) => new Date(k + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const chip = (on) => ({ background: on ? "#1F2A33" : "#FAFAF7", color: on ? "#fff" : "#16202A", border: `1px solid ${on ? "#1F2A33" : "#DAD8D0"}` });
  const dateInput = "gb-focus w-full rounded-xl px-2.5 text-[14px] border min-h-[44px]";
  return (
    <div className="fixed inset-0 z-[90] flex flex-col no-print" style={{ background: "#F4F3EF", color: "#16202A" }}>
      <div className="shrink-0 px-5 pb-3 flex items-start gap-3" style={{ paddingTop: "max(22px, env(safe-area-inset-top))" }}>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "#5B6470" }}>Commandes fournisseur</p>
          <h2 className="font-display font-bold text-[22px] leading-tight break-words">{supplier.name}</h2>
        </div>
        <button onClick={onClose} className="gb-focus w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#fff", border: "1px solid #E2E0D9" }} aria-label="Fermer"><X size={18} /></button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto gb-scroll px-5 flex flex-col gap-3.5" style={{ paddingBottom: "calc(110px + env(safe-area-inset-bottom))" }}>
        <section className="rounded-[20px] p-4 flex flex-col gap-3.5 text-white" style={{ background: "#1F2A33" }}>
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <span className="text-[13px]" style={{ color: "#C9D1D8" }}>Total de la période</span>
            <span className="text-[12px]" style={{ color: "#C9D1D8" }}>{from === "2000-01-01" ? "Depuis le début" : `${shortDate(from)} → ${shortDate(to)}`}</span>
          </div>
          <span className="font-display font-bold text-[30px] leading-none break-words">{fmt(total)}</span>
          <div className="grid grid-cols-3 gap-2">
            {[["Commandes", inRange.length, "#fff"], ["Reçues", nReceived, "#A6E07A"], ["En attente", nPending, "#FFC266"]].map(([l, n, c]) => (
              <div key={l} className="rounded-xl p-2.5 flex flex-col gap-0.5 min-w-0" style={{ background: "rgba(255,255,255,0.07)" }}>
                <span className="text-[11.5px]" style={{ color: "#C9D1D8" }}>{l}</span>
                <span className="font-display font-bold text-[18px]" style={{ color: c }}>{n}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[20px] p-4 flex flex-col gap-3" style={{ background: "#fff", border: "1px solid #E6E4DD" }}>
          <span className="flex items-center gap-2 text-[14px] font-bold"><CalendarCheck size={17} /> Période</span>
          <div className="flex flex-wrap gap-2">
            {[["today", "Aujourd'hui"], ["7j", "7 jours"], ["30j", "30 jours"], ["mois", "Ce mois"], ["mprec", "Mois dernier"], ["annee", "Cette année"], ["tout", "Tout"]].map(([k, l]) => (
              <button key={k} onClick={() => applyPreset(k)} className="gb-focus min-h-[38px] px-3.5 rounded-full text-[13px] font-semibold" style={chip(preset === k)}>{l}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <label className="flex flex-col gap-1.5 text-[12px] font-semibold" style={{ color: "#5B6470" }}>Du
              <input type="date" value={from === "2000-01-01" ? "" : from} max={to} onChange={(e) => { if (e.target.value) { setFrom(e.target.value); setPreset("perso"); } }} className={dateInput} style={{ borderColor: "#DAD8D0", background: "#FAFAF7", color: "#16202A" }} />
            </label>
            <label className="flex flex-col gap-1.5 text-[12px] font-semibold" style={{ color: "#5B6470" }}>Au
              <input type="date" value={to} min={from === "2000-01-01" ? undefined : from} onChange={(e) => { if (e.target.value) { setTo(e.target.value); setPreset("perso"); } }} className={dateInput} style={{ borderColor: "#DAD8D0", background: "#FAFAF7", color: "#16202A" }} />
            </label>
          </div>
        </section>

        <div className="flex p-1 gap-1 rounded-xl" style={{ background: "#E9E7E0" }}>
          {[["all", "Toutes", inRange.length], ["received", "Reçues", nReceived], ["pending", "En attente", nPending]].map(([k, l, n]) => (
            <button key={k} onClick={() => setStatus(k)} className="gb-focus flex-1 min-w-0 min-h-[38px] rounded-[9px] text-[12.5px] font-bold flex items-center justify-center gap-1.5" style={status === k ? { background: "#fff", color: "#16202A", boxShadow: "0 1px 3px rgba(22,32,42,0.12)" } : { color: "#4A525C" }}>{l} <span className="text-[11px] opacity-70">{n}</span></button>
          ))}
        </div>

        {shown.length === 0 && (
          <div className="rounded-[18px] p-7 text-center flex flex-col gap-1.5" style={{ background: "#fff", border: "1px dashed #D5D2C8" }}>
            <span className="text-[15px] font-bold">Aucune commande sur cette période</span>
            <span className="text-[13px]" style={{ color: "#5B6470" }}>Élargissez la plage de dates ou changez le filtre.</span>
          </div>
        )}
        {shown.map((o) => {
          const received = o.status === "received";
          const crates = (o.items || []).reduce((sum, i) => sum + (Number(i.crates) || 0), 0);
          const tone = received ? { bg: "#E6F2D9", fg: "#3A6410", dot: "#5B9A1E", label: "Reçue" } : { bg: "#FFF1D6", fg: "#7A4E00", dot: "#E09A1A", label: "En attente" };
          return (
            <button key={o.id} onClick={() => onOpenOrder(o)} className="gb-focus rounded-[18px] p-4 text-left flex flex-col gap-3" style={{ background: "#fff", border: "1px solid #E6E4DD" }}>
              <span className="flex justify-between items-start gap-3 w-full">
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[16px] font-bold capitalize">{new Date(o.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                  <span className="text-[13px]" style={{ color: "#5B6470" }}>N° {o.id.slice(0, 6).toUpperCase()} · {crates} casier{crates > 1 ? "s" : ""}</span>
                </span>
                <span className="flex flex-col items-end shrink-0">
                  <span className="font-display font-bold text-[18px] whitespace-nowrap">{fmt(orderTotalOf(o))}</span>
                  {received && o.receivedDate && <span className="text-[11px] font-semibold" style={{ color: "#5B6470" }}>reçue le {new Date(o.receivedDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>}
                </span>
              </span>
              <span className="h-px w-full" style={{ background: "#EFEDE7" }} />
              <span className="flex justify-between items-center w-full">
                <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[12.5px] font-bold" style={{ background: tone.bg, color: tone.fg }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: tone.dot }} />{tone.label}</span>
                <span className="flex items-center gap-1 text-[13px] font-semibold" style={{ color: "#1F2A33" }}>{received ? "Détails" : <><Pencil size={14} /> Modifier</>}<ChevronRight size={16} /></span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="absolute left-0 right-0 bottom-0 px-5 pt-3.5" style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))", background: "linear-gradient(rgba(244,243,239,0), #F4F3EF 30%)" }}>
        <button onClick={onNewOrder} className="gb-focus w-full min-h-[54px] rounded-2xl text-white text-[16px] font-bold flex items-center justify-center gap-2" style={{ background: "#1F2A33", boxShadow: "0 8px 20px rgba(31,42,51,0.25)" }}><Plus size={18} /> Nouvelle commande</button>
      </div>
    </div>
  );
}

function SuppliersSection({ suppliers, saveSuppliers, expenses, saveExpenses, products, saveProducts, categories, saveCategories, movements, saveMovements, orders, saveOrders, supplierProducts, saveSupplierProducts, pushToast, pushNotification, shop }) {
  const fmt = useFmt();
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [orderFor, setOrderFor] = useState(null);
  const [catalogFor, setCatalogFor] = useState(null);
  const [ordersFor, setOrdersFor] = useState(null);
  const [openOrder, setOpenOrder] = useState(null);
  const [openReceivedOrder, setOpenReceivedOrder] = useState(null);
  const upsert = (s) => { const exists = suppliers.some((x) => x.id === s.id); saveSuppliers(exists ? suppliers.map((x) => (x.id === s.id ? s : x)) : [...suppliers, s]); setEditing(null); setAdding(false); };
  const del = (id, name) => { if (window.confirm(`Supprimer "${name}" ?`)) saveSuppliers(suppliers.filter((x) => x.id !== id)); };
  const allOrders = orders || [];
  const allSupplierProducts = supplierProducts || [];

  const createOrder = (order) => { saveOrders([order, ...allOrders]); pushToast("Commande enregistrée", "ok"); };
  const updateOrder = (updated) => { saveOrders(allOrders.map((o) => (o.id === updated.id ? updated : o))); pushToast("Commande mise à jour", "ok"); };
  const deleteOrder = (order) => { saveOrders(allOrders.filter((o) => o.id !== order.id)); pushToast("Commande supprimée", "ok"); };
  const [menuFor, setMenuFor] = useState(null);
  const [confirmDeleteSupplier, setConfirmDeleteSupplier] = useState(null);
  const [supplierQuery, setSupplierQuery] = useState("");
  const saveSupplierProduct = (entry) => {
    const exists = allSupplierProducts.some((x) => x.id === entry.id);
    saveSupplierProducts(exists ? allSupplierProducts.map((x) => (x.id === entry.id ? entry : x)) : [...allSupplierProducts, entry]);
    // Répercute immédiatement le prix de vente et le coût sur la fiche produit
    // du catalogue, sans attendre la validation d'une commande.
    if (entry.productId) {
      const unitCost = entry.crateSize > 0 ? Math.round(entry.cratePrice / entry.crateSize) : 0;
      const matched = products.find((p) => p.id === entry.productId);
      if (matched) {
        const nextProducts = products.map((p) => (p.id === entry.productId ? { ...p, costPrice: unitCost, price: entry.salePrice > 0 ? entry.salePrice : p.price } : p));
        saveProducts(nextProducts);
      }
    }
  };
  const deleteSupplierProduct = (id) => saveSupplierProducts(allSupplierProducts.filter((x) => x.id !== id));

  // Valider une commande en attente = elle a été payée au fournisseur et les
  // casiers restants (après retrait des articles manquants) sont réceptionnés :
  // le stock augmente (nombre de casiers × bouteilles par casier), une dépense
  // est enregistrée, le prix de revient du produit se met à jour, et la
  // commande passe "reçue".
  const validateOrder = (order) => {
    let nextProducts = [...products];
    const receiveMovements = [];
    const createdNames = [];
    order.items.forEach((i) => {
      const unitsReceived = i.crates * i.crateSize;
      const unitCost = i.crateSize > 0 ? Math.round(i.cratePrice / i.crateSize) : 0;
      const existing = nextProducts.find((p) => p.id === i.productId) || nextProducts.find((p) => p.name.trim().toLowerCase() === i.productName.trim().toLowerCase());
      if (existing) {
        const before = existing.stock;
        nextProducts = nextProducts.map((p) => (p.id === existing.id ? { ...p, stock: p.stock + unitsReceived, costPrice: unitCost, price: i.salePrice > 0 ? i.salePrice : p.price } : p));
        receiveMovements.push({ id: uid(), date: new Date().toISOString(), productId: existing.id, productName: existing.name, type: "livraison", delta: unitsReceived, before, after: before + unitsReceived, author: shop?.adminDisplayName?.trim() || "Administrateur", note: `${i.crates} casier${i.crates > 1 ? "s" : ""} de ${i.crateSize}` });
      } else {
        // Produit encore inconnu du stock : on le crée automatiquement avec les
        // infos de la commande (nom, code-barre, catégorie, coût par bouteille,
        // et le vrai prix de vente saisi dans la liste des produits fournisseur).
        const newProduct = {
          id: uid(), name: i.productName, barcode: i.barcode || "", category: i.category || categories[0]?.id || "",
          price: i.salePrice > 0 ? i.salePrice : unitCost, costPrice: unitCost, stock: unitsReceived, openingStock: unitsReceived, openingStockDate: new Date().toISOString(),
          minStock: Math.max(i.crateSize, 5), unit: "bouteille", favorite: false,
        };
        nextProducts = [...nextProducts, newProduct];
        createdNames.push(i.productName);
        receiveMovements.push({ id: uid(), date: new Date().toISOString(), productId: newProduct.id, productName: newProduct.name, type: "creation", delta: unitsReceived, before: 0, after: unitsReceived, author: shop?.adminDisplayName?.trim() || "Administrateur", note: `Créé automatiquement — ${i.crates} casier${i.crates > 1 ? "s" : ""} de ${i.crateSize}` });
      }
    });
    const total = order.items.reduce((sum, i) => sum + i.crates * i.cratePrice, 0);
    const supplier = suppliers.find((s) => s.id === order.supplierId);
    const expense = { id: uid(), label: `Commande — ${supplier?.name || "Fournisseur"}`, amount: total, date: new Date().toISOString(), supplierId: order.supplierId };
    saveProducts(nextProducts);
    saveMovements([...receiveMovements, ...movements]);
    saveExpenses([expense, ...expenses]);
    saveOrders(allOrders.map((o) => (o.id === order.id ? { ...order, status: "received", receivedDate: new Date().toISOString(), total } : o)));
    pushToast(
      createdNames.length > 0
        ? `Commande validée — ${createdNames.join(", ")} ajouté${createdNames.length > 1 ? "s" : ""} au stock, pense à vérifier le prix de vente`
        : "Commande validée — stock et prix de revient mis à jour, dépense enregistrée",
      "ok"
    );
    pushNotification?.({ type: "order_validated", supplierName: supplier?.name || "Fournisseur", total, itemCount: order.items.length });
  };

  return (
    <div>
      {(() => {
        const pendingTotal = allOrders.filter((o) => o.status === "pending").length;
        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
        const activeThisMonth = suppliers.filter((s) => allOrders.some((o) => o.supplierId === s.id && new Date(o.date) >= monthStart)).length;
        return (
          <section className="rounded-[22px] p-4 mb-3.5 flex flex-col gap-3.5 text-white" style={{ background: "#1F2A33" }}>
            <div className="flex justify-between items-start gap-3">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[13px]" style={{ color: "#C9D1D8" }}>Vos fournisseurs</span>
                <span className="font-display font-bold text-[30px] leading-none">{suppliers.length}</span>
              </div>
              <button onClick={() => { setAdding(true); setEditing(null); }} className="gb-focus min-h-[42px] px-4 rounded-xl text-[14px] font-bold flex items-center gap-1.5 shrink-0" style={{ background: "#fff", color: "#1F2A33" }}><Plus size={16} /> Ajouter</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl px-3 py-2.5 flex items-center gap-2.5 min-w-0" style={{ background: "rgba(255,255,255,0.07)" }}>
                <span className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: "rgba(255,194,102,0.18)" }}><Clock size={16} color="#FFC266" /></span>
                <span className="flex flex-col min-w-0"><span className="font-display font-bold text-[17px]">{pendingTotal}</span><span className="text-[12px] leading-tight" style={{ color: "#C9D1D8" }}>Commandes en attente</span></span>
              </div>
              <div className="rounded-xl px-3 py-2.5 flex items-center gap-2.5 min-w-0" style={{ background: "rgba(255,255,255,0.07)" }}>
                <span className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: "rgba(166,224,122,0.18)" }}><Truck size={16} color="#A6E07A" /></span>
                <span className="flex flex-col min-w-0"><span className="font-display font-bold text-[17px]">{activeThisMonth}</span><span className="text-[12px] leading-tight" style={{ color: "#C9D1D8" }}>Actifs ce mois</span></span>
              </div>
            </div>
          </section>
        );
      })()}
      {suppliers.length > 2 && (
        <label className="flex items-center gap-2.5 min-h-[48px] px-3.5 mb-3.5 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--line)" }}>
          <Search size={17} className="opacity-50" />
          <input value={supplierQuery} onChange={(e) => setSupplierQuery(e.target.value)} placeholder="Rechercher un fournisseur, un numéro…" aria-label="Rechercher un fournisseur" className="flex-1 min-w-0 bg-transparent outline-none text-[15px]" />
        </label>
      )}
      {adding && <SupplierForm onSave={upsert} onCancel={() => setAdding(false)} />}
      <div className="flex flex-col gap-3">
        {suppliers.filter((s) => {
          const q = supplierQuery.trim().toLowerCase().replace(/\s/g, "");
          return !q || (s.name || "").toLowerCase().replace(/\s/g, "").includes(q) || (s.phone || "").replace(/\s/g, "").includes(q) || (s.note || "").toLowerCase().includes(q);
        }).map((s, idx) => {
          const PALETTE = [["#DDF3EC", "#0B5745", "#14A37F"], ["#E3EDFB", "#173F70", "#3B7DD8"], ["#FDEFD9", "#6E3C00", "#E09A1A"], ["#FBE3E0", "#8A2419", "#E0513F"], ["#EEE7FB", "#4A2E85", "#8B63D6"]];
          const c = PALETTE[idx % PALETTE.length];
          const supplierOrders = allOrders.filter((o) => o.supplierId === s.id).sort((a, b) => new Date(b.date) - new Date(a.date));
          const pendingCount = supplierOrders.filter((o) => o.status === "pending").length;
          const productCount = allSupplierProducts.filter((sp) => sp.supplierId === s.id).length;
          const words = (s.name || "?").replace(/\(.*?\)/g, "").trim().split(/\s+/).filter(Boolean);
          const initialsTxt = ((words[0] || "?")[0] + ((words[1] || words[0] || "")[words[1] ? 0 : 1] || "")).toUpperCase();
          const digits = (s.phone || "").replace(/[^\d+]/g, "");
          const phoneDisplay = digits.startsWith("+225") ? `+225 ${digits.slice(4).replace(/(\d{2})(?=\d)/g, "$1 ")}` : (s.phone || "");
          return editing === s.id ? (
            <SupplierForm key={s.id} initial={s} onSave={upsert} onCancel={() => setEditing(null)} />
          ) : (
            <article key={s.id} className="rounded-[20px] p-4 flex flex-col gap-3.5" style={{ background: "var(--card)", border: "1px solid var(--line)", boxShadow: "0 1px 2px rgba(22,32,42,0.04)" }}>
              <div className="flex gap-3 items-start min-w-0">
                <div className="w-12 h-12 rounded-[15px] flex items-center justify-center shrink-0 font-display font-bold text-[17px]" style={{ background: c[0], color: c[1] }}>{initialsTxt}</div>
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <span className="font-display font-bold text-[16px] leading-tight break-words">{s.name}</span>
                  {s.note && <span className="self-start max-w-full inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12.5px] font-bold leading-tight break-words" style={{ background: c[0], color: c[1], border: `1px solid ${c[2]}` }}><span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: c[2] }} />{s.note}</span>}
                </div>
                <button onClick={() => setMenuFor(s)} aria-label={`Plus d'actions pour ${s.name}`} className="gb-focus w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ border: "1px solid var(--line)", background: "var(--card)" }}><MoreVertical size={18} /></button>
              </div>

              {digits ? (
                <a href={`tel:${digits}`} aria-label={`Appeler ${s.name} au ${phoneDisplay}`} className="gb-focus flex items-center gap-2.5 min-h-[56px] p-2 rounded-2xl" style={{ background: "#EAF6EF", border: "1px solid #C6E6D2" }}>
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#1E8E50" }}><Phone size={17} color="#fff" /></span>
                  <span className="flex-1 min-w-0 flex flex-col">
                    <span className="font-bold whitespace-nowrap overflow-hidden" style={{ color: "#0F4F2B", fontVariantNumeric: "tabular-nums", fontSize: "clamp(12.5px, 3.6vw, 15px)", letterSpacing: "-0.01em", textOverflow: "clip" }}>{phoneDisplay}</span>
                    <span className="text-[11.5px] font-semibold whitespace-nowrap" style={{ color: "#256B43" }}>Toucher pour appeler</span>
                  </span>
                  <span className="shrink-0 h-[34px] px-2.5 rounded-[10px] text-white text-[12.5px] font-bold flex items-center" style={{ background: "#1E8E50" }}>Appeler</span>
                </a>
              ) : (
                <button onClick={() => { setEditing(s.id); setAdding(false); }} className="gb-focus min-h-[48px] rounded-2xl text-[13.5px] font-semibold flex items-center justify-center gap-2" style={{ border: "1.5px dashed var(--line)" }}><Phone size={16} /> Ajouter un numéro</button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl px-3 py-2.5 flex flex-col gap-0.5 min-w-0" style={{ background: "var(--paper-dim)" }}>
                  <span className="text-[11.5px] font-semibold opacity-60">Dernière commande</span>
                  <span className="text-[14px] font-bold">{supplierOrders[0] ? new Date(supplierOrders[0].date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—"}</span>
                </div>
                <div className="rounded-xl px-3 py-2.5 flex flex-col gap-0.5 min-w-0" style={{ background: "var(--paper-dim)" }}>
                  <span className="text-[11.5px] font-semibold opacity-60">Produits suivis</span>
                  <span className="text-[14px] font-bold">{productCount}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {digits ? (
                  <a href={`https://wa.me/${digits.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" aria-label={`Écrire à ${s.name} sur WhatsApp`} className="gb-focus min-h-[64px] px-1 py-2 rounded-[14px] flex flex-col items-center justify-center gap-1.5 text-[12.5px] font-bold text-center" style={{ background: "#EAF6EF", color: "#0F4F2B" }}><MessageCircle size={20} color="#1E8E50" />WhatsApp</a>
                ) : <span className="min-h-[64px] rounded-[14px]" style={{ background: "var(--paper-dim)" }} />}
                <button onClick={() => setCatalogFor(s)} className="gb-focus min-h-[64px] px-1 py-2 rounded-[14px] flex flex-col items-center justify-center gap-1.5 text-[12.5px] font-bold" style={{ background: "#E6EEFA", color: "#173F70" }}><Boxes size={20} color="#1D4E89" />Produits</button>
                <button onClick={() => setOrdersFor(s)} className="gb-focus relative min-h-[64px] px-1 py-2 rounded-[14px] flex flex-col items-center justify-center gap-1.5 text-[12.5px] font-bold" style={{ background: "#FCEEDB", color: "#74400A" }}>
                  <ClipboardList size={20} color="#8A4B00" />Commandes
                  {pendingCount > 0 && <span className="absolute top-1.5 right-1.5 min-w-[20px] h-5 px-1.5 rounded-full text-[11.5px] font-bold flex items-center justify-center text-white" style={{ background: "#C2410C" }} aria-label={`${pendingCount} en attente`}>{pendingCount}</span>}
                </button>
              </div>
            </article>
          );
        })}
        {suppliers.length === 0 && <p className="text-sm opacity-50 text-center py-6">Aucun fournisseur enregistré.</p>}
      </div>
      {menuFor && (
        <div className="fixed inset-0 z-[90] flex flex-col justify-end no-print" style={{ background: "rgba(22,32,42,0.45)" }}>
          <button className="flex-1" onClick={() => setMenuFor(null)} aria-label="Fermer" />
          <div className="rounded-t-3xl px-5 pt-2.5 flex flex-col gap-1.5" style={{ background: "var(--card)", paddingBottom: "max(26px, env(safe-area-inset-bottom))" }}>
            <div className="w-10 h-1 rounded-full self-center mb-2" style={{ background: "var(--line)" }} />
            <span className="font-display font-bold text-[18px] mb-1.5 break-words">{menuFor.name}</span>
            <button onClick={() => { setEditing(menuFor.id); setAdding(false); setMenuFor(null); }} className="gb-focus min-h-[52px] px-3.5 rounded-2xl text-[15px] font-semibold flex items-center gap-3" style={{ background: "var(--paper-dim)" }}><Pencil size={18} /> Modifier le fournisseur</button>
            <button onClick={() => { setConfirmDeleteSupplier(menuFor); setMenuFor(null); }} className="gb-focus min-h-[52px] px-3.5 rounded-2xl text-[15px] font-bold flex items-center gap-3" style={{ background: "#FBE4E1", color: "#9B2C1F" }}><Trash2 size={18} /> Supprimer le fournisseur</button>
          </div>
        </div>
      )}
      {confirmDeleteSupplier && (
        <div className="fixed inset-0 z-[91] flex items-center justify-center p-6 no-print" style={{ background: "rgba(22,32,42,0.55)" }}>
          <div role="dialog" aria-modal="true" className="w-full max-w-[380px] rounded-[22px] p-5 flex flex-col gap-3" style={{ background: "var(--card)" }}>
            <h2 className="font-display font-bold text-[20px] break-words">Supprimer {confirmDeleteSupplier.name} ?</h2>
            <p className="text-[14px] leading-relaxed opacity-70">Le fournisseur sera retiré de la liste. L'historique des dépenses et des commandes reçues est conservé.</p>
            <div className="grid grid-cols-2 gap-2.5 mt-1">
              <button onClick={() => setConfirmDeleteSupplier(null)} className="gb-focus min-h-[48px] rounded-2xl text-[15px] font-bold" style={{ border: "1px solid var(--line)" }}>Annuler</button>
              <button onClick={() => { saveSuppliers(suppliers.filter((x) => x.id !== confirmDeleteSupplier.id)); setConfirmDeleteSupplier(null); pushToast("Fournisseur supprimé", "ok"); }} className="gb-focus min-h-[48px] rounded-2xl text-[15px] font-bold text-white" style={{ background: "#B3261E" }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
      {catalogFor && (
        <SupplierProductsModal
          supplier={catalogFor}
          products={products}
          categories={categories}
          saveCategories={saveCategories}
          supplierProducts={allSupplierProducts}
          onSave={saveSupplierProduct}
          onDelete={deleteSupplierProduct}
          onClose={() => setCatalogFor(null)}
          pushToast={pushToast}
        />
      )}
      {orderFor && <PurchaseOrderModal supplier={orderFor} supplierProducts={allSupplierProducts} onCreate={(order) => { createOrder(order); setOrderFor(null); }} onClose={() => setOrderFor(null)} />}
      {ordersFor && (
        <SupplierOrdersModal
          supplier={ordersFor}
          ordersForSupplier={allOrders.filter((o) => o.supplierId === ordersFor.id)}
          onNewOrder={() => { setOrderFor(ordersFor); setOrdersFor(null); }}
          onOpenOrder={(o) => { if (o.status === "pending") setOpenOrder(o); else setOpenReceivedOrder(o); setOrdersFor(null); }}
          onClose={() => setOrdersFor(null)}
        />
      )}
      {openReceivedOrder && (
        <ReceivedOrderModal
          order={openReceivedOrder}
          supplier={suppliers.find((s) => s.id === openReceivedOrder.supplierId)}
          onClose={() => setOpenReceivedOrder(null)}
        />
      )}
      {openOrder && (
        <PendingOrderModal
          order={openOrder}
          supplier={suppliers.find((s) => s.id === openOrder.supplierId)}
          supplierProducts={allSupplierProducts}
          onUpdate={updateOrder}
          onValidate={validateOrder}
          onDelete={deleteOrder}
          onClose={() => setOpenOrder(null)}
          pushToast={pushToast}
        />
      )}
    </div>
  );
}

function VendorExpensesScreen({ expenses, saveExpenses, suppliers, vendorName }) {
  const fmt = useFmt();
  const [adding, setAdding] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const mine = expenses.filter((e) => e.author === vendorName);
  const todayMine = mine.filter((e) => e.date === today);
  const total = todayMine.reduce((s, e) => s + Number(e.amount), 0);
  const sorted = [...todayMine].sort((a, b) => new Date(b.date) - new Date(a.date));
  const add = (e) => { saveExpenses([...expenses, e]); setAdding(false); };
  return (
    <div className="px-4 pt-4 pb-28">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display font-bold text-lg">Dépenses du jour</h2>
        <button onClick={() => setAdding(true)} className="gb-focus flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white" style={{ background: "var(--glass)" }}><Plus size={14} /> Ajouter</button>
      </div>
      <p className="text-xs opacity-50 mb-3">Uniquement vos propres dépenses, remises à zéro chaque jour.</p>
      <div className="rounded-2xl p-3.5 mb-3" style={{ background: "var(--glass)" }}>
        <div className="text-white/60 text-[11px]">Total dépensé aujourd'hui</div>
        <div className="font-mono font-bold text-white text-lg mt-1">{fmt(total)}</div>
      </div>
      {adding && <ExpenseForm onSave={add} onCancel={() => setAdding(false)} suppliers={suppliers} author={vendorName} />}
      <div className="flex flex-col gap-2.5">
        {sorted.map((e) => {
          const supplier = suppliers.find((s) => s.id === e.supplierId);
          return (
            <div key={e.id} className="rounded-2xl p-3 flex items-center gap-3 border" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><Wallet size={15} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{e.label}</div>
                <div className="text-xs opacity-50 font-mono">{new Date(e.date).toLocaleDateString("fr-FR")}{supplier ? ` · ${supplier.name}` : ""}</div>
              </div>
              <span className="font-mono text-sm font-semibold">{fmt(e.amount)}</span>
            </div>
          );
        })}
        {sorted.length === 0 && !adding && <p className="text-sm opacity-50 text-center py-6">Aucune dépense enregistrée aujourd'hui.</p>}
      </div>
    </div>
  );
}

function ExpensesSection({ expenses, saveExpenses, suppliers, pushNotification, shop }) {
  const fmt = useFmt();
  const [adding, setAdding] = useState(false);
  const add = (e) => { saveExpenses([...expenses, e]); setAdding(false); pushNotification?.({ type: "expense", label: e.label, amount: e.amount, author: e.author }); speak(`Dépense enregistrée : ${e.label}, ${spokenAmount(fmt(e.amount))}.`, voiceOn(shop, "expense")); };
  const del = (id, label) => { if (window.confirm(`Supprimer la dépense "${label}" ?`)) saveExpenses(expenses.filter((x) => x.id !== id)); };
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-base">Dépenses ({expenses.length})</h3>
        <button onClick={() => setAdding(true)} className="gb-focus flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white" style={{ background: "var(--glass)" }}><Plus size={14} /> Ajouter</button>
      </div>
      <div className="rounded-2xl p-3.5 mb-3" style={{ background: "var(--glass)" }}>
        <div className="text-white/60 text-[11px]">Total dépenses enregistrées</div>
        <div className="font-mono font-bold text-white text-lg mt-1">{fmt(total)}</div>
      </div>
      {adding && <ExpenseForm onSave={add} onCancel={() => setAdding(false)} suppliers={suppliers} author={shop?.adminDisplayName?.trim() || "Administrateur"} />}
      <div className="flex flex-col gap-2.5">
        {sorted.map((e) => {
          const supplier = suppliers.find((s) => s.id === e.supplierId);
          return (
            <div key={e.id} className="rounded-2xl p-3 flex items-center gap-3 border" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><Wallet size={15} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{e.label}</div>
                <div className="text-xs opacity-50 font-mono">{new Date(e.date).toLocaleDateString("fr-FR")}{supplier ? ` · ${supplier.name}` : ""}{e.author ? ` · ${e.author}` : ""}</div>
              </div>
              <span className="font-mono text-sm font-semibold">{fmt(e.amount)}</span>
              <button onClick={() => del(e.id, e.label)} className="gb-focus w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><Trash2 size={14} color="var(--danger)" /></button>
            </div>
          );
        })}
        {sorted.length === 0 && <p className="text-sm opacity-50 text-center py-6">Aucune dépense enregistrée.</p>}
      </div>
    </div>
  );
}

function VendorsSection({ vendors, saveVendors, pushToast, adminPin, adminPinHash, backendLinked, pushNotification }) {
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const upsert = (v) => { const exists = vendors.some((x) => x.id === v.id); saveVendors(exists ? vendors.map((x) => (x.id === v.id ? v : x)) : [...vendors, v]); setEditing(null); setAdding(false); };
  const del = (id, name) => { if (window.confirm(`Supprimer le vendeur "${name}" ?`)) saveVendors(vendors.filter((x) => x.id !== id)); };
  const toggleBlocked = (v) => {
    saveVendors(vendors.map((x) => (x.id === v.id ? { ...x, blocked: !x.blocked } : x)));
    pushToast(v.blocked ? `${v.name} débloqué` : `${v.name} bloqué`, "ok");
    pushNotification?.({ type: v.blocked ? "vendor_unblocked" : "vendor_blocked", vendorName: v.name });
  };
  const copyJoinCode = async (code) => {
    try { await navigator.clipboard.writeText(code); pushToast("Code de liaison copié !", "ok"); } catch { pushToast("Impossible de copier", "error"); }
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-base flex items-center gap-2"><Users size={16} color="#534AB7" /> Vendeurs ({vendors.length})</h3>
        <button onClick={() => { setAdding(true); setEditing(null); }} className="gb-focus flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white" style={{ background: "var(--glass)" }}><Plus size={14} /> Ajouter</button>
      </div>
      {adding && <VendorForm onSave={upsert} onCancel={() => setAdding(false)} pushToast={pushToast} vendors={vendors} adminPin={adminPin} adminPinHash={adminPinHash} backendLinked={backendLinked} />}
      <div className="flex flex-col gap-2.5">
        {vendors.map((v) => editing === v.id ? (
          <VendorForm key={v.id} initial={v} onSave={upsert} onCancel={() => setEditing(null)} pushToast={pushToast} vendors={vendors} adminPin={adminPin} adminPinHash={adminPinHash} backendLinked={backendLinked} />
        ) : (
          <div key={v.id} className="rounded-2xl p-3.5" style={{ border: `1px solid ${v.blocked ? "var(--danger)" : "#AFA9EC"}`, background: "var(--card)", opacity: v.blocked ? 0.75 : 1 }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold" style={{ background: "#EEEDFE", color: "#534AB7" }}>{v.name.slice(0, 2).toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                  {v.name}
                  {v.blocked && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0" style={{ background: "var(--danger)" }}>BLOQUÉ</span>}
                </div>
                <div className="mt-1">
                  {v.pin ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] opacity-50">Code PIN</span>
                      <span className="text-sm font-mono font-bold tracking-widest px-2 py-0.5 rounded-lg" style={{ background: "#EEEDFE", color: "#534AB7" }}>{v.pin}</span>
                    </div>
                  ) : (
                    <div className="text-xs" style={{ color: "var(--danger)" }}>⚠ Aucun code — à réinitialiser</div>
                  )}
                </div>
              </div>
              <button onClick={() => toggleBlocked(v)} className="gb-focus w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }} title={v.blocked ? "Débloquer" : "Bloquer"}>
                {v.blocked ? <Unlock size={14} color="var(--glass)" /> : <Lock size={14} />}
              </button>
              <button onClick={() => { setEditing(v.id); setAdding(false); }} className="gb-focus w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><Pencil size={14} /></button>
              <button onClick={() => del(v.id, v.name)} className="gb-focus w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><Trash2 size={14} color="var(--danger)" /></button>
            </div>
            {backendLinked && v.joinCode && (
              <div className="flex items-center justify-between gap-2 mt-2.5 rounded-xl px-3 py-2" style={{ background: "#EEEDFE" }}>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#534AB7" }}>Code de liaison</p>
                  <p className="text-sm font-mono font-bold tracking-[0.1em]" style={{ color: "#534AB7" }}>{v.joinCode}</p>
                </div>
                <button onClick={() => copyJoinCode(v.joinCode)} className="gb-focus flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shrink-0" style={{ background: "var(--card)", color: "#534AB7" }}>
                  <Download size={13} className="rotate-180" /> Copier
                </button>
              </div>
            )}
          </div>
        ))}
        {vendors.length === 0 && <p className="text-sm opacity-50 text-center py-6">Aucun vendeur enregistré.</p>}
      </div>
    </div>
  );
}

/* ---------- Clients & fidélité ---------- */

function ClientForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState(initial || { name: "", phone: "", notes: "" });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  return (
    <div className="rounded-2xl border p-4 mb-3 gb-slide-up" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
      <div className="flex flex-col gap-2.5">
        <input className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder="Nom du client" value={f.name} onChange={(e) => set("name", e.target.value)} />
        <input className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder="Téléphone (optionnel)" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
        <input className="gb-focus rounded-xl px-3 py-2 text-sm border" style={{ borderColor: "var(--line)" }} placeholder="Note (optionnel)" value={f.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={onCancel} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--paper-dim)" }}>Annuler</button>
        <button onClick={() => { if (!f.name.trim()) return; onSave({ ...f, id: f.id || uid(), name: f.name.trim() }); }} className="gb-focus flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: "var(--glass)" }}>Enregistrer</button>
      </div>
    </div>
  );
}

function ClientDetail({ client, sales, loyaltyThreshold, onRedeemReward, onClose }) {
  const fmt = useFmt();
  const purchases = sales.filter((s) => s.clientId === client.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalSpent = purchases.reduce((s, x) => s + x.total, 0);
  const totalCredit = purchases.filter((s) => s.paymentMethod === "credit").reduce((s, x) => s + x.total, 0);
  const outstandingCredit = purchases.filter((s) => s.paymentMethod === "credit" && !s.paid).reduce((s, x) => s + x.total, 0);
  const threshold = loyaltyThreshold || 10;
  const rewardsEarned = Math.floor(purchases.length / threshold);
  const rewardsAvailable = rewardsEarned - (client.loyaltyRedeemed || 0);
  const progress = purchases.length % threshold;

  return (
    <div className="fixed inset-0 z-50 flex items-end no-print">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full rounded-t-3xl p-5 gb-slide-up max-h-[85vh] overflow-y-auto gb-scroll" style={{ background: "var(--card)" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-lg">{client.name}</h2>
            {client.phone && <p className="text-xs opacity-50">{client.phone}</p>}
          </div>
          <button onClick={onClose} className="gb-focus p-1"><X size={20} /></button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 mb-4">
          <StatCard icon={TrendingUp} label="Total dépensé" value={fmt(totalSpent)} dark />
          <StatCard icon={Receipt} label="Achats enregistrés" value={purchases.length} />
          <StatCard icon={CreditCard} label="Crédit total accordé" value={fmt(totalCredit)} />
          <StatCard icon={AlertTriangle} label="Crédit en cours" value={fmt(outstandingCredit)} danger={outstandingCredit > 0} />
        </div>

        <div className="rounded-2xl p-3.5 mb-4" style={{ background: "var(--paper-dim)" }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold flex items-center gap-1.5"><Gift size={13} color="var(--cap)" /> Fidélité</span>
            <span className="text-[11px] opacity-50">{progress}/{threshold} achats</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: "var(--line)" }}>
            <div className="h-full rounded-full" style={{ width: `${(progress / threshold) * 100}%`, background: "var(--cap)" }} />
          </div>
          {rewardsAvailable > 0 ? (
            <button onClick={() => onRedeemReward(client.id)} className="gb-focus w-full rounded-xl py-2 text-xs font-semibold text-white" style={{ background: "var(--glass)" }}>
              🎁 {rewardsAvailable} récompense{rewardsAvailable > 1 ? "s" : ""} disponible{rewardsAvailable > 1 ? "s" : ""} — marquer utilisée
            </button>
          ) : (
            <p className="text-[11px] opacity-50">Encore {threshold - progress} achat{threshold - progress > 1 ? "s" : ""} avant la prochaine récompense.</p>
          )}
        </div>

        <h3 className="font-display font-bold text-base mb-2">Historique d'achats</h3>
        {purchases.length === 0 && <p className="text-sm opacity-50 text-center py-6">Aucun achat enregistré pour ce client.</p>}
        <div className="flex flex-col gap-2">
          {purchases.map((s) => (
            <div key={s.id} className="rounded-xl p-3 border flex items-center justify-between" style={{ borderColor: "var(--line)" }}>
              <div>
                <div className="text-xs font-medium">{new Date(s.date).toLocaleDateString("fr-FR")}</div>
                <div className="text-[10px] opacity-50">{s.items.length} article{s.items.length > 1 ? "s" : ""} · {PAYMENT_LABELS[s.paymentMethod]}{s.paymentMethod === "credit" && !s.paid ? " · impayé" : ""}</div>
              </div>
              <span className="font-mono text-sm font-semibold">{fmt(s.total)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Sauvegardes automatiques (serveur) ----------
// Chaque nuit à 03:00 (heure GMT), le serveur garde une copie complète des
// données de l'entreprise ; les 30 dernières restent disponibles ici.
function AutoBackupCard({ shop, onRestoreServerBackup, pushToast }) {
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const linked = !!shop?.backendLinked;
  const load = async (fn = api.listBackups) => {
    setLoading(true); setError("");
    try { setList(await fn(shop.id)); }
    catch { setError("Impossible de joindre le serveur. Vérifiez la connexion internet."); }
    setLoading(false);
  };
  useEffect(() => { if (linked) load(); }, [linked, shop?.id]);
  const dayLabel = (b) => {
    const d = new Date(`${b.day}T12:00:00`);
    const today = new Date(); const y = new Date(); y.setDate(today.getDate() - 1);
    const base = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
    if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (d.toDateString() === y.toDateString()) return `Hier · ${base}`;
    return base.charAt(0).toUpperCase() + base.slice(1);
  };
  const size = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1).replace(".", ",")} Mo` : `${Math.max(1, Math.round((n || 0) / 1024))} Ko`);
  const restore = async (b) => {
    setBusyId(b.id);
    try { await onRestoreServerBackup(b.id, dayLabel(b).toLowerCase()); pushToast("Données restaurées", "ok"); setConfirmId(null); }
    catch { pushToast("Restauration impossible — réessayez", "error"); }
    setBusyId(null);
  };
  if (!linked) {
    return (
      <div className="rounded-2xl p-4 mb-3 flex items-start gap-3" style={{ background: "#FFF1D6", color: "#6E3C00" }}>
        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
        <p className="text-[13px] leading-snug">Les sauvegardes automatiques nécessitent la synchronisation en ligne de l'entreprise. En attendant, exportez régulièrement une sauvegarde ci-dessous.</p>
      </div>
    );
  }
  const latest = list?.[0];
  const shown = showAll ? list || [] : (list || []).slice(0, 7);
  return (
    <>
      <div className="rounded-[20px] p-4 mb-3 text-white" style={{ background: "#1F2A33" }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: latest ? "rgba(166,224,122,0.18)" : "rgba(255,255,255,0.1)" }}>{latest ? <Check size={22} color="#A6E07A" /> : <RefreshCw size={20} color="#fff" className={loading ? "animate-spin" : ""} />}</div>
          <div className="min-w-0">
            <p className="font-display font-bold text-[17px]">{latest ? "Données protégées" : loading ? "Chargement…" : "Aucune sauvegarde pour l'instant"}</p>
            <p className="text-[12.5px]" style={{ color: "#B7C0C8" }}>{latest ? `Dernière sauvegarde : ${dayLabel(latest).toLowerCase()} à ${new Date(latest.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : "La première sera faite cette nuit à 03:00."}</p>
          </div>
        </div>
        {latest?.summary && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[["Ventes", latest.summary.sales], ["Produits", latest.summary.products], ["Clients", latest.summary.clients]].map(([l, v]) => (
              <div key={l} className="rounded-xl px-2.5 py-2" style={{ background: "rgba(255,255,255,0.07)" }}><p className="text-[11px]" style={{ color: "#C9D1D8" }}>{l}</p><p className="font-display font-bold text-[15px]">{v ?? 0}</p></div>
            ))}
          </div>
        )}
      </div>
      <div className="rounded-2xl border p-4 mb-3 flex items-center gap-3" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
        <div className="flex-1 min-w-0">
          <p className="text-[14.5px] font-semibold">Sauvegarde automatique</p>
          <p className="text-[12.5px] opacity-60">Chaque nuit à 03:00 (GMT) · 30 jours conservés</p>
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0" style={{ background: "#EAF6EF", color: "#1E8E50" }}>ACTIVE</span>
      </div>
      <div className="rounded-2xl border px-4 pt-3 pb-2 mb-3" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-[11.5px] font-bold uppercase tracking-wider opacity-55">{showAll ? "30 derniers jours" : "7 derniers jours"}</p>
          <button onClick={() => load()} disabled={loading} className="gb-focus text-[12px] font-semibold flex items-center gap-1 opacity-70 disabled:opacity-40"><RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Actualiser</button>
        </div>
        {error && <p className="text-[12.5px] py-2" style={{ color: "#B3261E" }}>{error}</p>}
        {list && list.length === 0 && !error && <p className="text-[13px] opacity-60 py-3">Aucune sauvegarde encore. Touchez « Sauvegarder maintenant ».</p>}
        {shown.map((b, i) => (
          <div key={b.id} style={{ borderTop: i ? "1px solid var(--line)" : "none" }}>
            <div className="flex items-center gap-3 py-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#E6EEFA" }}><Download size={15} color="#173F70" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold">{dayLabel(b)}</p>
                <p className="text-[12px] opacity-55">{new Date(b.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · {size(b.size_bytes)}{b.summary ? ` · ${b.summary.sales ?? 0} ventes` : ""}</p>
              </div>
              <button onClick={() => setConfirmId(confirmId === b.id ? null : b.id)} className="gb-focus px-3 py-2 rounded-xl text-[12.5px] font-bold shrink-0" style={{ background: "var(--paper-dim)" }}>Restaurer</button>
            </div>
            {confirmId === b.id && (
              <div className="rounded-xl p-3 mb-2.5 gb-slide-up" style={{ background: "#FCEBE8" }}>
                <p className="text-[12.5px] mb-2.5" style={{ color: "#8A2419" }}>Toutes les données actuelles (ventes, stock, clients…) seront remplacées par celles du {dayLabel(b).toLowerCase()} sur tous les appareils. Le journal d'activité est conservé.</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmId(null)} className="gb-focus flex-1 rounded-xl py-2.5 text-[13px] font-semibold" style={{ background: "#fff" }}>Annuler</button>
                  <button onClick={() => restore(b)} disabled={busyId === b.id} className="gb-focus flex-1 rounded-xl py-2.5 text-[13px] font-semibold text-white disabled:opacity-50" style={{ background: "var(--danger)" }}>{busyId === b.id ? "…" : "Restaurer"}</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {list && list.length > 7 && <button onClick={() => setShowAll(!showAll)} className="gb-focus py-2 text-[13px] font-semibold" style={{ color: "#0F6E56" }}>{showAll ? "Afficher moins" : `Voir les ${list.length} sauvegardes`}</button>}
      </div>
      <button onClick={() => load(api.backupNow).then(() => pushToast("Sauvegarde effectuée", "ok"))} disabled={loading} className="gb-focus w-full rounded-2xl min-h-[50px] mb-5 text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: "#1F2A33" }}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Sauvegarder maintenant</button>
    </>
  );
}

function DataSection({ shop, data, onRestore, onRestoreServerBackup, pushToast }) {
  const [pending, setPending] = useState(null);
  const fileRef = useRef(null);

  const exportBackup = () => {
    const bundle = { exportedAt: new Date().toISOString(), shopName: shop.name, ...data };
    const filename = `sauvegarde-${shop.name.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.json`;
    exportCsvFile(filename, JSON.stringify(bundle, null, 2))
      .then(() => pushToast("Sauvegarde téléchargée", "ok"))
      .catch(() => pushToast("Impossible d'exporter la sauvegarde — réessayez", "error"));
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed.products || !parsed.sales) throw new Error("format invalide");
        setPending(parsed);
      } catch {
        pushToast("Fichier de sauvegarde invalide", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const confirmRestore = () => {
    onRestore(pending);
    setPending(null);
    pushToast("Sauvegarde restaurée", "ok");
  };

  return (
    <div>
      <h3 className="font-display font-bold text-base mb-3">Sauvegarde &amp; restauration</h3>
      <AutoBackupCard shop={shop} onRestoreServerBackup={onRestoreServerBackup} pushToast={pushToast} />
      <p className="text-[11.5px] font-bold uppercase tracking-wider opacity-55 mb-2">Sauvegarde dans un fichier</p>

      <div className="rounded-2xl border p-4 mb-3" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
        <p className="text-xs opacity-60 mb-3">Télécharge une copie complète des données de cette entreprise (produits, ventes, clients, stock...) dans un fichier que tu peux conserver en lieu sûr.</p>
        <button onClick={exportBackup} className="gb-focus w-full rounded-xl py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-1.5" style={{ background: "var(--glass)" }}>
          <Download size={15} /> Exporter une sauvegarde
        </button>
      </div>

      <div className="rounded-2xl border p-4" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
        <p className="text-xs opacity-60 mb-3">Restaure les données à partir d'un fichier de sauvegarde. ⚠️ Cela remplace entièrement les données actuelles de cette entreprise.</p>
        <input ref={fileRef} type="file" accept="application/json" onChange={handleFile} className="hidden" />
        <button onClick={() => fileRef.current?.click()} className="gb-focus w-full rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--paper-dim)" }}>
          Choisir un fichier de sauvegarde
        </button>

        {pending && (
          <div className="mt-3 rounded-xl p-3.5 gb-slide-up" style={{ background: "#FCEBE8" }}>
            <p className="text-xs font-semibold mb-1" style={{ color: "var(--danger)" }}>Confirmer la restauration ?</p>
            <p className="text-[11px] mb-3" style={{ color: "var(--danger)" }}>
              Sauvegarde du {pending.exportedAt ? new Date(pending.exportedAt).toLocaleDateString("fr-FR") : "?"} — {pending.products?.length ?? 0} produits, {pending.sales?.length ?? 0} ventes. Toutes les données actuelles seront remplacées.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPending(null)} className="gb-focus flex-1 rounded-xl py-2 text-xs font-semibold" style={{ background: "#fff" }}>Annuler</button>
              <button onClick={confirmRestore} className="gb-focus flex-1 rounded-xl py-2 text-xs font-semibold text-white" style={{ background: "var(--danger)" }}>Restaurer</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ClientsSection({ clients, saveClients, sales, shop, pushToast }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [query, setQuery] = useState("");

  const upsert = (c) => {
    const exists = clients.some((x) => x.id === c.id);
    saveClients(exists ? clients.map((x) => (x.id === c.id ? c : x)) : [...clients, c]);
    setAdding(false); setEditing(null);
  };
  const del = (id, name) => { if (window.confirm(`Supprimer le client "${name}" ?`)) saveClients(clients.filter((x) => x.id !== id)); };
  const redeemReward = (id) => {
    saveClients(clients.map((x) => (x.id === id ? { ...x, loyaltyRedeemed: (x.loyaltyRedeemed || 0) + 1 } : x)));
    pushToast("Récompense marquée comme utilisée", "ok");
  };

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
  const detailClient = clients.find((c) => c.id === detailId);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-base">Clients ({clients.length})</h3>
        <button onClick={() => { setAdding(true); setEditing(null); }} className="gb-focus flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white" style={{ background: "var(--glass)" }}><UserPlus size={14} /> Ajouter</button>
      </div>
      <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-3" style={{ background: "var(--paper-dim)" }}>
        <Search size={15} className="opacity-50" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un client" className="gb-focus bg-transparent outline-none text-sm flex-1 min-w-0" />
      </div>
      {adding && <ClientForm onSave={upsert} onCancel={() => setAdding(false)} />}
      <div className="flex flex-col gap-2.5">
        {filtered.map((c) => editing === c.id ? (
          <ClientForm key={c.id} initial={c} onSave={upsert} onCancel={() => setEditing(null)} />
        ) : (
          <div key={c.id} className="rounded-2xl p-3 flex items-center gap-3 border" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
            <button onClick={() => setDetailId(c.id)} className="gb-focus flex items-center gap-3 flex-1 min-w-0 text-left">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><Users size={16} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{c.name}</div>
                <div className="text-xs opacity-50 font-mono truncate">{c.phone || "Pas de téléphone"}</div>
              </div>
            </button>
            <button onClick={() => { setEditing(c.id); setAdding(false); }} className="gb-focus w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><Pencil size={14} /></button>
            <button onClick={() => del(c.id, c.name)} className="gb-focus w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><Trash2 size={14} color="var(--danger)" /></button>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm opacity-50 text-center py-6">Aucun client trouvé.</p>}
      </div>

      {detailClient && (
        <ClientDetail client={detailClient} sales={sales} loyaltyThreshold={shop.loyaltyThreshold} onRedeemReward={redeemReward} onClose={() => setDetailId(null)} />
      )}
    </div>
  );
}

// ---------- Journal d'activité ----------
const AUDIT_TYPES = {
  vente: { label: "Ventes", Icon: Receipt, bg: "#FBE4E1", fg: "#B3261E" },
  prix: { label: "Prix", Icon: Coins, bg: "#FFF1D6", fg: "#8A4B00" },
  stock: { label: "Stock", Icon: Boxes, bg: "#E6EEFA", fg: "#173F70" },
  caisse: { label: "Caisse", Icon: Banknote, bg: "#EAF6EF", fg: "#1E8E50" },
  securite: { label: "Sécurité", Icon: ShieldCheck, bg: "#EEEDFE", fg: "#534AB7" },
  connexion: { label: "Connexions", Icon: LogOut, bg: "#EFEDE7", fg: "#5B6470" },
};

function ActivityLogSection({ shop, auditLog = [], pushToast }) {
  const fmt = useFmt();
  const [type, setType] = useState("all");
  const [period, setPeriod] = useState("7j");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(150);
  const now = Date.now();
  const since = period === "today" ? new Date(new Date().toDateString()).getTime() : period === "7j" ? now - 7 * 864e5 : period === "30j" ? now - 30 * 864e5 : 0;
  const q = query.trim().toLowerCase();
  const list = (auditLog || [])
    .filter((e) => (type === "all" || e.type === type) && new Date(e.date).getTime() >= since)
    .filter((e) => !q || `${e.text} ${e.by || ""}`.toLowerCase().includes(q))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const groups = [];
  list.slice(0, limit).forEach((e) => {
    const key = new Date(e.date).toDateString();
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) { g = { key, date: e.date, items: [] }; groups.push(g); }
    g.items.push(e);
  });
  const dayLabel = (d) => {
    const x = new Date(d); const t = new Date();
    const y = new Date(); y.setDate(t.getDate() - 1);
    const base = x.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    if (x.toDateString() === t.toDateString()) return `Aujourd'hui · ${base}`;
    if (x.toDateString() === y.toDateString()) return `Hier · ${base}`;
    return base.charAt(0).toUpperCase() + base.slice(1);
  };
  const exportPdf = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const plain = (v) => String(v ?? "").replace(/[  ]/g, " ").replace(/−/g, "-").replace(/→/g, "->").replace(/…/g, "...");
      const W = 595, L = 40, R = 555;
      doc.setFillColor(31, 42, 51); doc.rect(0, 0, W, 80, "F");
      doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.text(plain(shop?.name || "GestiOne"), L, 38);
      doc.setFontSize(11); doc.setFont("helvetica", "normal"); doc.text("Journal d'activité", L, 58);
      doc.setFontSize(9); doc.text(plain(`${list.length} action(s) · exporté le ${new Date().toLocaleString("fr-FR")}`), R, 58, { align: "right" });
      let y = 110;
      doc.setTextColor(22, 32, 42);
      let lastDay = "";
      list.forEach((e) => {
        const day = new Date(e.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        const lines = doc.splitTextToSize(plain(e.text), 330);
        const h = Math.max(1, lines.length) * 12 + 10;
        if (y + h + (day !== lastDay ? 24 : 0) > 800) { doc.addPage(); y = 50; lastDay = ""; }
        if (day !== lastDay) { doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(91, 100, 112); doc.text(plain(day.toUpperCase()), L, y); y += 16; lastDay = day; doc.setTextColor(22, 32, 42); }
        doc.setFont("helvetica", "normal"); doc.setFontSize(9);
        doc.text(new Date(e.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }), L, y);
        doc.text(plain(AUDIT_TYPES[e.type]?.label || e.type || ""), L + 42, y);
        doc.text(lines, L + 110, y);
        doc.text(plain(e.by || ""), R, y, { align: "right" });
        y += h;
        doc.setDrawColor(230, 228, 221); doc.line(L, y - 6, R, y - 6);
      });
      await exportPdfDoc(`journal_activite_${new Date().toISOString().slice(0, 10)}.pdf`, doc);
    } catch { pushToast?.("Impossible de générer le PDF", "error"); }
  };
  const chip = (id, label, current, set) => (
    <button key={id} onClick={() => set(id)} className="gb-focus px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap" style={{ background: current === id ? "#1F2A33" : "var(--card)", color: current === id ? "#fff" : "var(--ink)", border: current === id ? "1px solid #1F2A33" : "1px solid var(--line)" }}>{label}</button>
  );
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="font-display font-bold text-base">Journal d'activité</h3>
        <button onClick={exportPdf} className="gb-focus flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full text-white" style={{ background: "var(--glass)" }}><Download size={13} /> PDF</button>
      </div>
      <div className="rounded-2xl px-3.5 py-3 mb-3 flex items-start gap-2.5" style={{ background: "#E1F5EE", color: "#0F4F2B" }}>
        <Lock size={16} className="shrink-0 mt-0.5" />
        <p className="text-[13px] font-medium leading-snug">Chaque action est enregistrée avec son auteur et son heure. Une ligne enregistrée ne peut être ni modifiée ni effacée.</p>
      </div>
      <div className="flex flex-wrap gap-2 mb-2">
        {chip("all", "Tout", type, setType)}
        {Object.entries(AUDIT_TYPES).map(([id, m]) => chip(id, m.label, type, setType))}
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {[["today", "Aujourd'hui"], ["7j", "7 jours"], ["30j", "30 jours"], ["all", "Tout"]].map(([id, l]) => chip(id, l, period, setPeriod))}
      </div>
      <div className="flex items-center gap-2 rounded-xl px-3 mb-3" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>
        <Search size={15} className="opacity-50 shrink-0" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher (produit, vendeur, N° de vente…)" className="gb-focus flex-1 min-w-0 bg-transparent py-2.5 text-[14px] outline-none" />
      </div>
      {list.length === 0 && <p className="text-sm opacity-50 text-center py-8">Aucune action sur cette période.</p>}
      <div className="flex flex-col gap-3">
        {groups.map((g) => (
          <div key={g.key} className="rounded-2xl px-4 pt-3 pb-1" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>
            <p className="text-[11.5px] font-bold uppercase tracking-wider opacity-55 mb-1">{dayLabel(g.date)}</p>
            {g.items.map((e, i) => {
              const m = AUDIT_TYPES[e.type] || AUDIT_TYPES.stock;
              const amt = Number(e.amount);
              return (
                <div key={e.id} className="flex items-start gap-3 py-2.5" style={{ borderTop: i ? "1px solid var(--line)" : "none" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: m.bg }}><m.Icon size={16} color={m.fg} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold leading-snug break-words">{e.text}</p>
                    <p className="text-[12px] opacity-55 mt-0.5">{e.by || "—"} · {new Date(e.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  {Number.isFinite(amt) && amt !== 0 && e.amount !== undefined && <span className="font-mono font-bold text-[13px] whitespace-nowrap" style={{ color: amt < 0 ? "#B3261E" : "#1E8E50" }}>{amt > 0 ? "+" : "−"}{fmt(Math.abs(amt))}</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {list.length > limit && <button onClick={() => setLimit(limit + 150)} className="gb-focus w-full mt-3 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "var(--paper-dim)" }}>Afficher plus ({list.length - limit})</button>}
    </div>
  );
}

// ---------- Export comptable mensuel ----------
function monthBounds(y, m) { return [new Date(y, m, 1).getTime(), new Date(y, m + 1, 1).getTime()]; }
function buildMonthReport({ sales = [], expenses = [], products = [], versements = [] }, y, m) {
  const [from, to] = monthBounds(y, m);
  const inM = (d) => { const t = new Date(d).getTime(); return t >= from && t < to; };
  const costOf = (it) => { const snap = Number(it.product?.costPrice) || 0; if (snap > 0) return snap; const p = products.find((x) => x.id === (it.product?.id || it.id)); return Number(p?.costPrice) || 0; };
  const monthSales = sales.filter((s) => inM(s.date));
  let ca = 0, cogs = 0, cashIn = 0, momoIn = 0, creditGiven = 0, creditIn = 0, refunds = 0, returnsValue = 0;
  const byProduct = {};
  const byDay = {};
  monthSales.forEach((s) => {
    const total = Number(s.total) || 0;
    ca += total;
    const dk = new Date(s.date).toLocaleDateString("fr-FR");
    if (!byDay[dk]) byDay[dk] = { date: dk, t: new Date(s.date).getTime(), tickets: 0, especes: 0, mobile: 0, credit: 0, total: 0 };
    byDay[dk].tickets += 1; byDay[dk].total += total; byDay[dk][s.paymentMethod === "mobile" ? "mobile" : s.paymentMethod === "credit" ? "credit" : "especes"] += total;
    if (s.paymentMethod === "especes") cashIn += total + returnedAmountOf(s);
    else if (s.paymentMethod === "mobile") momoIn += total + returnedAmountOf(s);
    else if (s.paymentMethod === "credit") creditGiven += total;
    (s.items || []).forEach((it) => {
      const qty = Number(it.qty) || 0;
      const rev = it.product ? computeItemTotal(it.product, qty) : 0;
      const cost = qty * costOf(it);
      cogs += cost;
      const key = it.product?.name || "?";
      if (!byProduct[key]) byProduct[key] = { name: key, qty: 0, rev: 0, cost: 0 };
      byProduct[key].qty += qty; byProduct[key].rev += rev; byProduct[key].cost += cost;
    });
  });
  sales.forEach((s) => {
    if (s.paymentMethod === "credit") creditPaymentsOf(s).forEach((p) => { if (inM(p.date)) creditIn += Number(p.amount) || 0; });
    saleReturnsOf(s).forEach((r) => { if (inM(r.date)) { refunds += r.refundMode === "especes" || r.refundMode === "mobile" ? Number(r.refund) || 0 : 0; returnsValue += Number(r.amount) || 0; } });
  });
  const monthExpenses = expenses.filter((e) => inM(e.date));
  const expTotal = monthExpenses.reduce((t, e) => t + (Number(e.amount) || 0), 0);
  const marge = ca - cogs;
  return {
    from, to, monthSales, monthExpenses, ca, cogs, marge, expTotal, result: marge - expTotal,
    cashIn, momoIn, creditGiven, creditIn, refunds, returnsValue,
    encaisse: cashIn + momoIn + creditIn - refunds,
    byProduct: Object.values(byProduct).sort((a, b) => b.rev - a.rev),
    byDay: Object.values(byDay).sort((a, b) => a.t - b.t),
    monthVersements: versements.filter((v) => inM(v.date)),
    openCredits: sales.filter((s) => s.paymentMethod === "credit" && !s.paid && new Date(s.date).getTime() < to),
  };
}

function AccountingExportSection({ shop, sales, expenses, products, versements, pushToast }) {
  const fmt = useFmt();
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [busy, setBusy] = useState(false);
  const R = buildMonthReport({ sales, expenses, products, versements }, ym.y, ym.m);
  const monthLabel = new Date(ym.y, ym.m, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const Month = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  const lastDay = new Date(ym.y, ym.m + 1, 0).getDate();
  const shift = (d) => setYm(({ y, m }) => { const x = new Date(y, m + d, 1); return { y: x.getFullYear(), m: x.getMonth() }; });
  const isFuture = new Date(ym.y, ym.m + 1, 1) > new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const money = (n) => Math.round(Number(n) || 0);
  const download = async () => {
    setBusy(true);
    try {
      const { buildXlsx } = await import("./xlsx.js");
      const d = (x) => new Date(x).toLocaleDateString("fr-FR");
      const h = (x) => new Date(x).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      const sheets = [
        { name: "Synthèse", widths: [42, 18], rows: [
          ["Poste", `Montant (${shop?.currency || "XAF"})`],
          ["Entreprise", shop?.name || ""], ["Période", Month],
          ["Chiffre d'affaires (ventes nettes des retours)", money(R.ca)],
          ["Coût d'achat des marchandises vendues", money(R.cogs)],
          ["Marge brute", money(R.marge)],
          ["Dépenses", money(R.expTotal)],
          ["Résultat du mois", money(R.result)],
          ["", ""],
          ["Encaissé en espèces (ventes)", money(R.cashIn)], ["Encaissé en Mobile Money", money(R.momoIn)],
          ["Crédits accordés", money(R.creditGiven)], ["Crédits encaissés", money(R.creditIn)],
          ["Retours (valeur)", money(R.returnsValue)], ["Remboursements aux clients", money(R.refunds)],
          ["Total encaissé net", money(R.encaisse)],
          ["Nombre de tickets", R.monthSales.length],
        ] },
        { name: "Ventes", widths: [12, 8, 12, 18, 20, 14, 44, 12, 10, 12], rows: [
          ["Date", "Heure", "N° reçu", "Vendeur", "Client", "Paiement", "Articles", "Total", "Payé", "Retours"],
          ...R.monthSales.sort((a, b) => new Date(a.date) - new Date(b.date)).map((s) => [d(s.date), h(s.date), receiptNumber(s.id), s.vendor || "", s.clientName || "", PAYMENT_LABELS[s.paymentMethod] || s.paymentMethod, (s.items || []).map((i) => `${i.qty}× ${i.product?.name || "?"}`).join(", "), money(s.total), s.paymentMethod === "credit" ? (s.paid ? "Oui" : "Non") : "Oui", money(returnedAmountOf(s))]),
        ] },
        { name: "Ventes par jour", widths: [12, 10, 14, 14, 14, 14], rows: [
          ["Date", "Tickets", "Espèces", "Mobile Money", "Crédit", "Total"],
          ...R.byDay.map((x) => [x.date, x.tickets, money(x.especes), money(x.mobile), money(x.credit), money(x.total)]),
        ] },
        { name: "Dépenses", widths: [12, 40, 14, 20], rows: [
          ["Date", "Libellé", "Montant", "Saisie par"],
          ...R.monthExpenses.sort((a, b) => new Date(a.date) - new Date(b.date)).map((e) => [d(e.date), e.label || "", money(e.amount), e.author || ""]),
        ] },
        { name: "Marge par produit", widths: [32, 12, 16, 16, 16, 12], rows: [
          ["Produit", "Qté vendue", "Chiffre d'affaires", "Coût d'achat", "Marge", "Taux de marge %"],
          ...R.byProduct.map((p) => [p.name, p.qty, money(p.rev), money(p.cost), money(p.rev - p.cost), p.rev ? Math.round(((p.rev - p.cost) / p.rev) * 1000) / 10 : 0]),
        ] },
        { name: "Caisse et versements", widths: [16, 16, 12, 16, 12, 12, 18], rows: [
          ["Versé le", "Caisse ouverte le", "Fond", "Espèces attendues", "Versé", "Écart", "Versé par"],
          ...R.monthVersements.map((v) => [`${d(v.date)} ${h(v.date)}`, v.openedAt ? `${d(v.openedAt)} ${h(v.openedAt)}` : "", money(v.fund), money(v.expected), money(v.amount), money((Number(v.amount) || 0) - (Number(v.expected) || 0)), v.by || ""]),
        ] },
        { name: "Crédits clients", widths: [12, 12, 24, 14, 14, 14], rows: [
          ["Date", "N° reçu", "Client", "Total", "Déjà payé", "Reste à payer"],
          ...R.openCredits.map((s) => [d(s.date), receiptNumber(s.id), s.clientName || "", money(s.total), money(creditPaidSoFar(s)), money(Math.max(0, s.total - creditPaidSoFar(s)))]),
        ] },
      ];
      const bytes = buildXlsx(sheets);
      const safe = (shop?.name || "gestione").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      await exportBinaryFile(`compta-${safe}-${ym.y}-${String(ym.m + 1).padStart(2, "0")}.xlsx`, bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    } catch { pushToast?.("Impossible de créer le fichier Excel", "error"); }
    setBusy(false);
  };
  const shareSummary = () => {
    const t = [
      `${shop?.name || ""} — Bilan de ${monthLabel}`,
      `Chiffre d'affaires : ${fmt(R.ca)}`,
      `Coût des marchandises : ${fmt(R.cogs)}`,
      `Marge brute : ${fmt(R.marge)}`,
      `Dépenses : ${fmt(R.expTotal)}`,
      `Résultat du mois : ${fmt(R.result)}`,
      `Total encaissé net : ${fmt(R.encaisse)} (${R.monthSales.length} tickets)`,
    ].join("\n").replace(/[  ]/g, " ");
    shareText(`Bilan ${monthLabel}`, t).catch(() => {});
  };
  const contents = [
    ["Ventes", `${R.monthSales.length} ticket${R.monthSales.length > 1 ? "s" : ""}, par jour et mode de paiement`],
    ["Dépenses", `${R.monthExpenses.length} dépense${R.monthExpenses.length > 1 ? "s" : ""}`],
    ["Marge par produit", `${R.byProduct.length} produit${R.byProduct.length > 1 ? "s" : ""} : coût d'achat, prix de vente, marge`],
    ["Caisse et versements", `${R.monthVersements.length} clôture${R.monthVersements.length > 1 ? "s" : ""} avec écarts`],
    ["Crédits clients", `${R.openCredits.length} crédit${R.openCredits.length > 1 ? "s" : ""} encore ouverts`],
  ];
  const Tile = ({ label, value, bg, fg }) => (
    <div className="rounded-2xl px-3.5 py-3 min-w-0" style={{ background: bg, color: fg }}>
      <p className="text-[12px]" style={{ opacity: 0.85 }}>{label}</p>
      <p className="font-display font-bold text-[17px] leading-tight break-words">{fmt(value)}</p>
    </div>
  );
  return (
    <div>
      <h3 className="font-display font-bold text-base mb-3">Export comptable</h3>
      <div className="flex items-center gap-2 rounded-2xl p-2.5 mb-3" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>
        <button onClick={() => shift(-1)} className="gb-focus w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }} aria-label="Mois précédent"><ChevronLeft size={18} /></button>
        <div className="flex-1 text-center min-w-0"><p className="font-display font-bold text-[17px]">{Month}</p><p className="text-[12px] opacity-55">du 1er au {lastDay}</p></div>
        <button onClick={() => !isFuture && shift(1)} disabled={new Date(ym.y, ym.m + 1, 1) > now} className="gb-focus w-11 h-11 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-30" style={{ background: "var(--paper-dim)" }} aria-label="Mois suivant"><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Tile label="Chiffre d'affaires" value={R.ca} bg="#1F2A33" fg="#fff" />
        <Tile label="Dépenses" value={R.expTotal} bg="#FBE4E1" fg="#8A2419" />
        <Tile label="Marge brute" value={R.marge} bg="#E6EEFA" fg="#173F70" />
        <Tile label="Résultat du mois" value={R.result} bg={R.result >= 0 ? "#EAF6EF" : "#FBE4E1"} fg={R.result >= 0 ? "#0F4F2B" : "#8A2419"} />
      </div>
      <p className="text-[12px] opacity-60 mb-3">Encaissé net sur le mois : <b>{fmt(R.encaisse)}</b> (espèces, Mobile Money et crédits remboursés, moins les remboursements de retours).</p>
      <div className="rounded-2xl px-4 pt-3 pb-1 mb-3" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>
        <p className="text-[11.5px] font-bold uppercase tracking-wider opacity-55 mb-1">Contenu du fichier Excel</p>
        {contents.map(([n, d], i) => (
          <div key={n} className="flex items-center gap-3 py-2.5" style={{ borderTop: i ? "1px solid var(--line)" : "none" }}>
            <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#1E8E50" }}><Check size={14} color="#fff" /></span>
            <div className="min-w-0"><p className="text-[14px] font-semibold">{n}</p><p className="text-[12px] opacity-55">{d}</p></div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={download} disabled={busy} className="gb-focus min-h-[50px] rounded-2xl text-[14px] font-bold flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: "var(--card)", border: "1px solid var(--line)" }}><Download size={17} />{busy ? "…" : "Excel"}</button>
        <button onClick={shareSummary} className="gb-focus min-h-[50px] rounded-2xl text-white text-[14px] font-bold flex items-center justify-center gap-2" style={{ background: "#1F2A33" }}><Send size={17} /> Résumé</button>
      </div>
      <p className="text-[11.5px] opacity-50 mt-2">Le bouton Excel ouvre le partage du téléphone : envoyez le fichier au comptable par WhatsApp ou e-mail.</p>
    </div>
  );
}

// ---------- Performance des vendeurs ----------
function weekStart(d = new Date()) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // lundi = 0
  x.setDate(x.getDate() - day);
  return x.getTime();
}
function vendorStats(sales, from, to = Infinity) {
  const map = {};
  (sales || []).forEach((s) => {
    const t = new Date(s.date).getTime();
    if (t < from || t >= to) return;
    const k = s.vendor || "Non renseigné";
    if (!map[k]) map[k] = { name: k, ca: 0, tickets: 0, returns: 0, credit: 0, items: 0 };
    const v = map[k];
    v.ca += Number(s.total) || 0; v.tickets += 1;
    v.items += (s.items || []).reduce((n, i) => n + (Number(i.qty) || 0), 0);
    v.returns += saleReturnsOf(s).length;
    if (s.paymentMethod === "credit" && !s.paid) v.credit += Math.max(0, (Number(s.total) || 0) - creditPaidSoFar(s));
  });
  return Object.values(map).map((v) => ({ ...v, basket: v.tickets ? v.ca / v.tickets : 0 })).sort((a, b) => b.ca - a.ca);
}

function VendorGoalCard({ shop, sales, vendorName }) {
  const fmt = useFmt();
  const goal = Number(shop?.vendorGoals?.[vendorName]) || 0;
  if (!goal) return null;
  const done = vendorStats(sales, weekStart()).find((v) => v.name === vendorName)?.ca || 0;
  const pct = Math.min(100, Math.round((done / goal) * 100));
  return (
    <div className="rounded-2xl p-3.5 mb-3" style={{ background: "#1F2A33", color: "#fff" }}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[13px] font-bold flex items-center gap-2"><Star size={15} color="#F3C55C" /> Objectif de la semaine</span>
        <span className="font-display font-bold text-[15px]">{pct} %</span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.12)" }}><div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 100 ? "#A6E07A" : "#F3C55C" }} /></div>
      <p className="text-[12.5px] mt-2" style={{ color: "#C9D1D8" }}>{fmt(done)} sur {fmt(goal)}{pct >= 100 ? " · objectif atteint !" : ` · encore ${fmt(goal - done)}`}</p>
    </div>
  );
}

function VendorPerformanceSection({ shop, sales, vendors, saveShopMeta }) {
  const fmt = useFmt();
  const [period, setPeriod] = useState("7j");
  const [editGoals, setEditGoals] = useState(false);
  const adminName = shop?.adminDisplayName?.trim() || "Administrateur";
  const now = Date.now();
  const from = period === "today" ? new Date(new Date().toDateString()).getTime() : period === "7j" ? now - 7 * 864e5 : period === "30j" ? now - 30 * 864e5 : new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const stats = vendorStats(sales, from);
  const week = vendorStats(sales, weekStart());
  const total = stats.reduce((t, v) => t + v.ca, 0);
  const tickets = stats.reduce((t, v) => t + v.tickets, 0);
  const best = stats[0]?.ca || 1;
  const goals = shop?.vendorGoals || {};
  const people = Array.from(new Set([...(vendors || []).map((v) => v.name), adminName, ...stats.map((s) => s.name)])).filter(Boolean);
  const [draft, setDraft] = useState({});
  const COLORS = ["#0F6E56", "#173F70", "#8A4B00", "#534AB7", "#B3261E", "#1E8E50"];
  const initials = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  const chip = (id, label) => (
    <button key={id} onClick={() => setPeriod(id)} className="gb-focus px-3.5 py-2 rounded-full text-[13px] font-semibold" style={{ background: period === id ? "#1F2A33" : "var(--card)", color: period === id ? "#fff" : "var(--ink)", border: period === id ? "1px solid #1F2A33" : "1px solid var(--line)" }}>{label}</button>
  );
  return (
    <div>
      <h3 className="font-display font-bold text-base mb-3">Performance des vendeurs</h3>
      <div className="flex flex-wrap gap-2 mb-3">{chip("today", "Aujourd'hui")}{chip("7j", "7 jours")}{chip("30j", "30 jours")}{chip("month", "Ce mois")}</div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[["Total", fmt(total), "#1F2A33", "#fff"], ["Tickets", String(tickets), "#E6EEFA", "#173F70"], ["Panier moyen", fmt(tickets ? total / tickets : 0), "#EAF6EF", "#0F4F2B"]].map(([l, v, bg, fg]) => (
          <div key={l} className="rounded-2xl px-3 py-2.5 min-w-0" style={{ background: bg, color: fg }}><p className="text-[11.5px]" style={{ opacity: 0.85 }}>{l}</p><p className="font-display font-bold text-[14px] leading-tight break-words">{v}</p></div>
        ))}
      </div>
      {stats.length === 0 && <p className="text-sm opacity-50 text-center py-8">Aucune vente sur cette période.</p>}
      <div className="flex flex-col gap-2.5">
        {stats.map((v, i) => {
          const goal = Number(goals[v.name]) || 0;
          const weekCa = week.find((w) => w.name === v.name)?.ca || 0;
          const goalPct = goal ? Math.round((weekCa / goal) * 100) : null;
          return (
            <div key={v.name} className="rounded-[18px] p-3.5 flex flex-col gap-2.5" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-[12.5px] font-bold shrink-0" style={{ background: i === 0 ? "#E09A1A" : "var(--paper-dim)", color: i === 0 ? "#fff" : "var(--ink)" }}>{i + 1}</span>
                <span className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[13px] font-bold shrink-0" style={{ background: COLORS[i % COLORS.length] }}>{initials(v.name)}</span>
                <div className="flex-1 min-w-0"><p className="text-[15px] font-bold break-words">{v.name}</p><p className="text-[12px] opacity-60">{v.tickets} ticket{v.tickets > 1 ? "s" : ""} · panier moyen {fmt(v.basket)}</p></div>
                <span className="font-display font-bold text-[15px] whitespace-nowrap">{fmt(v.ca)}</span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--paper-dim)" }}><div className="h-full rounded-full" style={{ width: `${Math.max(3, (v.ca / best) * 100)}%`, background: COLORS[i % COLORS.length] }} /></div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2.5 py-1 rounded-full text-[12px] font-semibold" style={{ background: "var(--paper-dim)" }}>{v.items} article{v.items > 1 ? "s" : ""}</span>
                <span className="px-2.5 py-1 rounded-full text-[12px] font-semibold" style={{ background: v.returns ? "#FBE4E1" : "var(--paper-dim)", color: v.returns ? "#8A2419" : "var(--ink)" }}>Retours : {v.returns}</span>
                {v.credit > 0 && <span className="px-2.5 py-1 rounded-full text-[12px] font-semibold" style={{ background: "#FFF1D6", color: "#6E3C00" }}>Crédits ouverts : {fmt(v.credit)}</span>}
                {goalPct !== null && <span className="px-2.5 py-1 rounded-full text-[12px] font-semibold" style={{ background: goalPct >= 100 ? "#EAF6EF" : "#E6EEFA", color: goalPct >= 100 ? "#1E8E50" : "#173F70" }}>Objectif semaine : {goalPct} %</span>}
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={() => { setDraft(Object.fromEntries(people.map((n) => [n, goals[n] ? String(goals[n]) : ""]))); setEditGoals(true); }} className="gb-focus w-full mt-4 min-h-[52px] rounded-2xl text-white text-[14.5px] font-bold flex items-center justify-center gap-2" style={{ background: "#1F2A33" }}><Star size={17} /> Fixer les objectifs de la semaine</button>
      {editGoals && (
        <div className="fixed inset-0 z-[93] flex items-end sm:items-center justify-center no-print" style={{ background: "rgba(22,32,42,0.55)", padding: "max(24px, env(safe-area-inset-top)) 0 0" }} onClick={() => setEditGoals(false)}>
          <div className="w-full max-w-[440px] rounded-t-[26px] sm:rounded-[26px] flex flex-col gb-slide-up" style={{ background: "var(--paper)", maxHeight: "100%" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 pt-4 pb-3 flex items-center gap-3 shrink-0" style={{ borderBottom: "1px solid var(--line)" }}>
              <div className="flex-1 min-w-0"><p className="font-display font-bold text-[18px]">Objectifs de la semaine</p><p className="text-[12.5px] opacity-60">Chiffre d'affaires à atteindre du lundi au dimanche</p></div>
              <button onClick={() => setEditGoals(false)} className="gb-focus w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }} aria-label="Fermer"><X size={18} /></button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto gb-scroll px-5 pt-4 pb-4 flex flex-col gap-2.5">
              {people.map((n) => (
                <label key={n} className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>
                  <span className="flex-1 min-w-0 text-[14.5px] font-semibold break-words">{n}</span>
                  <input value={draft[n] || ""} onChange={(e) => setDraft((d) => ({ ...d, [n]: e.target.value.replace(/\D/g, "") }))} inputMode="numeric" placeholder="Aucun" className="gb-focus w-32 rounded-xl px-3 py-2 text-[14px] text-right font-mono" style={{ border: "1px solid var(--line)" }} />
                </label>
              ))}
              <p className="text-[12px] opacity-55">Chaque vendeur voit sa progression dans son historique des ventes.</p>
            </div>
            <div className="px-5 pt-3 shrink-0" style={{ borderTop: "1px solid var(--line)", paddingBottom: "max(18px, calc(env(safe-area-inset-bottom) + 12px))" }}>
              <button onClick={() => { const g = {}; Object.entries(draft).forEach(([k, v]) => { if (Number(v) > 0) g[k] = Number(v); }); saveShopMeta({ ...shop, vendorGoals: g }); setEditGoals(false); }} className="gb-focus w-full min-h-[52px] rounded-2xl text-white font-bold text-[15px]" style={{ background: "#0F6E56" }}>Enregistrer les objectifs</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SecuritySection({ shop, saveShopMeta, pushToast }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const submit = () => {
    const valid = shop.backendLinked ? api.verifyPin(current, shop.adminPinHash) : current === (shop.adminPin || DEFAULT_ADMIN_PIN);
    if (!valid) { pushToast("Code actuel incorrect", "error"); return; }
    if (next.length !== 4) { pushToast("Le nouveau code doit contenir 4 chiffres", "error"); return; }
    if (next !== confirm) { pushToast("Les deux codes ne correspondent pas", "error"); return; }
    if (next === current) { pushToast("Choisissez un code différent de l'ancien", "error"); return; }
    saveShopMeta(shop.backendLinked ? { ...shop, adminPinHash: api.hashPin(next) } : { ...shop, adminPin: next });
    pushToast("Code administrateur mis à jour", "ok");
    setCurrent(""); setNext(""); setConfirm("");
  };

  const lockMin = Number(shop.autoLockMinutes) || 0;
  const protect = shop.protectSensitive !== false;
  return (
    <div>
      <h3 className="font-display font-bold text-base mb-3">Sécurité</h3>
      <div className="rounded-2xl border p-4 mb-3" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
        <p className="text-[14.5px] font-bold flex items-center gap-2"><Lock size={15} /> Verrouillage automatique</p>
        <p className="text-[12.5px] opacity-60 mt-0.5 mb-3">Sans activité, l'écran se bloque et redemande le code de la personne connectée.</p>
        <div className="flex flex-wrap gap-2">
          {[[0, "Désactivé"], [2, "2 min"], [5, "5 min"], [10, "10 min"], [15, "15 min"]].map(([m, l]) => (
            <button key={m} onClick={() => saveShopMeta({ ...shop, autoLockMinutes: m })} className="gb-focus px-3.5 py-2 rounded-full text-[13px] font-semibold" style={{ background: lockMin === m ? "#1F2A33" : "var(--paper-dim)", color: lockMin === m ? "#fff" : "var(--ink)" }}>{l}</button>
          ))}
        </div>
      </div>
      <button type="button" onClick={() => saveShopMeta({ ...shop, protectSensitive: !protect })} className="gb-focus w-full rounded-2xl border p-4 mb-4 flex items-center gap-3 text-left" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
        <div className="flex-1 min-w-0">
          <p className="text-[14.5px] font-bold flex items-center gap-2"><ShieldCheck size={15} /> Code administrateur pour les actions sensibles</p>
          <p className="text-[12.5px] opacity-60 mt-0.5">Supprimer ou modifier une vente, changer un prix, supprimer un produit.</p>
        </div>
        <span className="w-12 h-7 rounded-full relative shrink-0" style={{ background: protect ? "#1E8E50" : "#C9C6BC" }}>
          <span className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow" style={{ left: protect ? 22 : 2 }} />
        </span>
      </button>
      <div className="rounded-2xl p-3.5 mb-4 flex items-start gap-2.5" style={{ background: "#FCEBEB" }}>
        <AlertTriangle size={16} color="#A32D2D" className="shrink-0 mt-0.5" />
        <p className="text-xs" style={{ color: "#A32D2D" }}>Change régulièrement le code administrateur, surtout s'il est encore sur la valeur par défaut (1234).</p>
      </div>
      <div className="rounded-2xl border p-4" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
        <label className="text-xs font-semibold opacity-60 mb-1.5 flex items-center gap-1.5"><Lock size={13} /> Code administrateur actuel</label>
        <input type="password" inputMode="numeric" maxLength={4} value={current} onChange={(e) => setCurrent(e.target.value.replace(/\D/g, "").slice(0, 4))} className="gb-focus w-full rounded-xl px-3 py-2 text-sm border font-mono mb-3 tracking-widest" style={{ borderColor: "var(--line)" }} placeholder="••••" />
        <label className="text-xs font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: "#0F6E56" }}><KeyRound size={13} /> Nouveau code (4 chiffres)</label>
        <input type="password" inputMode="numeric" maxLength={4} value={next} onChange={(e) => setNext(e.target.value.replace(/\D/g, "").slice(0, 4))} className="gb-focus w-full rounded-xl px-3 py-2 text-sm border font-mono mb-3 tracking-widest" style={{ borderColor: "#5DCAA5" }} placeholder="••••" />
        <label className="text-xs font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: "#0F6E56" }}><KeyRound size={13} /> Confirmer le nouveau code</label>
        <input type="password" inputMode="numeric" maxLength={4} value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))} className="gb-focus w-full rounded-xl px-3 py-2 text-sm border font-mono mb-4 tracking-widest" style={{ borderColor: "#5DCAA5" }} placeholder="••••" />
        <button onClick={submit} className="gb-focus w-full rounded-xl py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-2" style={{ background: "var(--glass)" }}><ShieldCheck size={15} /> Changer le code</button>
      </div>
    </div>
  );
}

const ADMIN_SECTIONS = [
  { id: "stats", label: "Vue d'ensemble", Icon: TrendingUp, group: null },
  { id: "etablissement", label: "Établissement", Icon: Store, group: "Établissement" },
  { id: "boutiques", label: "Entreprises", Icon: Layers, group: "Établissement" },
  { id: "securite", label: "Sécurité", Icon: ShieldCheck, group: "Établissement" },
  { id: "journal", label: "Journal d'activité", Icon: ClipboardCheck, group: "Établissement" },
  { id: "produits", label: "Produits", Icon: Boxes, group: "Gestion commerciale" },
  { id: "categories", label: "Catégories", Icon: ClipboardList, group: "Gestion commerciale" },
  { id: "inventaire", label: "Inventaire", Icon: ArrowUpCircle, group: "Gestion commerciale" },
  { id: "fournisseurs", label: "Fournisseurs", Icon: Truck, group: "Gestion commerciale" },
  { id: "depenses", label: "Dépenses", Icon: Wallet, group: "Finances" },
  { id: "export", label: "Export comptable", Icon: FileText, group: "Finances" },
  { id: "vendeurs", label: "Vendeurs", Icon: Users, group: "Équipe et clients" },
  { id: "performance", label: "Performance vendeurs", Icon: TrendingUp, group: "Équipe et clients" },
  { id: "clients", label: "Clients", Icon: UserPlus, group: "Équipe et clients" },
  { id: "abonnement", label: "Abonnement", Icon: CreditCard, group: "Abonnement" },
  { id: "licence", label: "Licence", Icon: Star, group: "Abonnement" },
  { id: "donnees", label: "Données", Icon: Download, group: "Données" },
  { id: "assistance", label: "Assistance", Icon: MessageCircle, group: "Assistance" },
];

function SupportInboxSection({ ownerAccess, onVerifyOwner, pushToast }) {
  const [email, setEmail] = useState("");
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState(null);
  const [activeDeviceId, setActiveDeviceId] = useState(null);
  const [thread, setThread] = useState([]);
  const [reply, setReply] = useState("");

  const fetchList = async (em, sc) => {
    setLoading(true);
    try {
      const data = await api.ownerSupportList({ email: em, secret: sc });
      setConversations(data.conversations);
      return true;
    } catch (e) {
      pushToast(e.message || "Accès refusé", "error");
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ownerAccess && conversations === null) fetchList(ownerAccess.email, ownerAccess.secret);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerAccess]);

  useEffect(() => {
    if (!ownerAccess) return;
    const interval = setInterval(() => fetchList(ownerAccess.email, ownerAccess.secret), 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerAccess]);

  const submit = async () => {
    const em = email.trim().toLowerCase();
    const ok = await fetchList(em, secret);
    if (ok) { onVerifyOwner({ email: em, secret }); pushToast("Accès propriétaire vérifié", "ok"); }
  };

  const openThread = async (deviceId) => {
    setActiveDeviceId(deviceId);
    try {
      const data = await api.ownerSupportMessages({ email: ownerAccess.email, secret: ownerAccess.secret, deviceId });
      setThread(data.messages);
    } catch (e) { pushToast(e.message, "error"); }
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    try {
      await api.ownerSupportReply({ email: ownerAccess.email, secret: ownerAccess.secret, deviceId: activeDeviceId, message: reply.trim() });
      setReply("");
      openThread(activeDeviceId);
    } catch (e) { pushToast(e.message, "error"); }
  };

  const delConversation = async (deviceId) => {
    if (!window.confirm("Supprimer définitivement cette conversation ?")) return;
    try {
      await api.ownerSupportDelete({ email: ownerAccess.email, secret: ownerAccess.secret, deviceId });
      pushToast("Conversation supprimée", "ok");
      setActiveDeviceId(null);
      fetchList(ownerAccess.email, ownerAccess.secret);
    } catch (e) { pushToast(e.message, "error"); }
  };

  if (!ownerAccess) {
    return (
      <div>
        <h3 className="font-display font-bold text-base mb-3">Assistance</h3>
        <div className="rounded-2xl border p-4" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={16} color="var(--glass)" />
            <p className="text-xs font-semibold">Page réservée au propriétaire de l'application</p>
          </div>
          <label className="text-xs font-semibold opacity-60 block mb-1.5">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="gb-focus w-full rounded-xl px-3 py-2 text-sm border mb-3" style={{ borderColor: "var(--line)" }} placeholder="email@exemple.com" />
          <label className="text-xs font-semibold opacity-60 block mb-1.5">{OWNER_SECURITY_QUESTION}</label>
          <input type="password" autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} className="gb-focus w-full rounded-xl px-3 py-2.5 text-sm border mb-4" style={{ borderColor: "var(--line)" }} placeholder="Réponse" />
          <button onClick={submit} disabled={loading} className="gb-focus w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: "var(--glass)" }}>
            {loading ? "Vérification…" : "Vérifier"}
          </button>
        </div>
      </div>
    );
  }

  if (activeDeviceId) {
    const conv = (conversations || []).find((c) => c.device_id === activeDeviceId);
    return (
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--paper-dim)" }}>
        <div className="px-3.5 py-3 flex items-center gap-2.5" style={{ background: "var(--glass)" }}>
          <button onClick={() => setActiveDeviceId(null)} className="gb-focus shrink-0"><ArrowUpCircle size={17} color="#fff" style={{ transform: "rotate(-90deg)" }} /></button>
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px]" style={{ background: "var(--cap)", color: "var(--glass)" }}>{initials(conv?.name || "Anonyme")}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white flex items-center gap-1.5 truncate">
              {conv?.name || "Anonyme"}
              {conv?.online && <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ background: "#5DCAA5" }} title="En ligne" />}
            </p>
            <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.55)" }}>{conv?.phone}{conv?.email ? ` · ${conv.email}` : ""}{conv?.shop_name ? ` · ${conv.shop_name}` : ""}</p>
          </div>
          <button onClick={() => delConversation(activeDeviceId)} className="gb-focus shrink-0" aria-label="Supprimer la conversation"><Trash2 size={16} color="#F09595" /></button>
        </div>
        <div className="flex flex-col gap-2 p-3.5 max-h-[50vh] overflow-y-auto gb-scroll">
          {thread.map((m) => (
            <div
              key={m.id}
              className="rounded-xl px-3 py-2 text-sm max-w-[80%] gb-slide-up"
              style={{
                background: m.sender === "owner" ? "var(--glass)" : "var(--card)",
                color: m.sender === "owner" ? "#fff" : "var(--ink)",
                alignSelf: m.sender === "owner" ? "flex-end" : "flex-start",
                border: m.sender === "owner" ? "none" : "1px solid var(--line)",
              }}
            >
              {m.body}
            </div>
          ))}
          {thread.length === 0 && <p className="text-sm opacity-50 text-center py-4">Aucun message.</p>}
        </div>
        <div className="flex items-center gap-2 p-3" style={{ background: "var(--card)", borderTop: "1px solid var(--line)" }}>
          <input value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendReply()} placeholder="Répondre…" className="gb-focus flex-1 min-w-0 rounded-full px-4 py-2.5 text-sm border" style={{ borderColor: "var(--line)" }} />
          <button onClick={sendReply} className="gb-focus shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--cap)" }} aria-label="Envoyer">
            <ArrowUpCircle size={17} color="var(--glass)" style={{ transform: "rotate(90deg)" }} />
          </button>
        </div>
      </div>
    );
  }

  const activeConversations = (conversations || []).filter((c) => c.last_message);
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-display font-bold text-base">Assistance</h3>
          <p className="text-[11px] opacity-50 mt-0.5">{activeConversations.length} conversation{activeConversations.length > 1 ? "s" : ""} active{activeConversations.length > 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => fetchList(ownerAccess.email, ownerAccess.secret)} disabled={loading} className="gb-focus flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white" style={{ background: "var(--glass)" }}>
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> {loading ? "…" : "Actualiser"}
        </button>
      </div>
      <div className="flex flex-col gap-2.5">
        {activeConversations.map((c) => (
          <button key={c.device_id} onClick={() => openThread(c.device_id)} className="gb-focus w-full text-left rounded-2xl p-3.5 flex gap-3 items-start" style={{ background: "var(--card)", boxShadow: "0 2px 10px rgba(15,27,22,0.07)" }}>
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[12px]" style={{ background: "#FAEEDA", color: "#854F0B" }}>{initials(c.name || "Anonyme")}</div>
              {c.online && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full gb-pulse" style={{ background: "#5DCAA5", border: "2px solid var(--card)" }} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold truncate">{c.name || "Anonyme"}</span>
                <span className="text-[10px] opacity-40 shrink-0">{c.last_message_at ? new Date(c.last_message_at).toLocaleDateString("fr-FR") : ""}</span>
              </div>
              <p className="text-xs opacity-60 truncate mt-0.5">{c.last_message}</p>
              <p className="text-[10px] opacity-40 mt-1 truncate">{c.phone}{c.shop_name ? ` · ${c.shop_name}` : ""}</p>
            </div>
          </button>
        ))}
        {conversations && activeConversations.length === 0 && <p className="text-sm opacity-50 text-center py-6">Aucun message pour l'instant.</p>}
      </div>
    </div>
  );
}

function OwnerActivateForm({ shopId, onActivated, onCancel, pushToast, ownerAccess }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    const digits = code.replace(/\D/g, "");
    if (digits.length !== 12) { pushToast("Le code doit contenir 12 chiffres", "error"); return; }
    setLoading(true);
    try {
      const result = await api.ownerActivateShop({ email: ownerAccess.email, secret: ownerAccess.secret, shopId, code: digits });
      pushToast("Licence activée sur cette entreprise", "ok");
      onActivated(result.subscription);
    } catch (e) {
      pushToast(e.message || "Code invalide", "error");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="rounded-xl p-3 mt-2.5" style={{ background: "#E6F1FB" }}>
      <p className="text-[11px] font-semibold mb-2" style={{ color: "#185FA5" }}>Coller le code d'activation (12 chiffres)</p>
      <input
        className="gb-focus w-full rounded-xl px-3 py-2 text-sm border font-mono mb-2 tracking-wider"
        style={{ borderColor: "#85B7EB", background: "var(--card)" }}
        placeholder="0000-0000-0000"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 12))}
      />
      <div className="flex gap-2">
        <button onClick={onCancel} disabled={loading} className="gb-focus flex-1 rounded-xl py-2 text-xs font-semibold" style={{ background: "var(--card)" }}>Annuler</button>
        <button onClick={submit} disabled={loading} className="gb-focus flex-1 rounded-xl py-2 text-xs font-semibold text-white" style={{ background: "#185FA5", opacity: loading ? 0.6 : 1 }}>{loading ? "Activation…" : "Activer"}</button>
      </div>
    </div>
  );
}

function SubscriptionSection({ ownerAccess, onVerifyOwner, pushToast }) {
  const [email, setEmail] = useState("");
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [allShops, setAllShops] = useState(null);
  const [activatingId, setActivatingId] = useState(null);
  const [resetResult, setResetResult] = useState(null);
  const [search, setSearch] = useState("");

  const fetchShops = async (em, sc, silent) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.getOwnerShops({ email: em, secret: sc });
      setAllShops(data.shops);
      return true;
    } catch (e) {
      if (!silent) pushToast(e.message || "Accès refusé", "error");
      return false;
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (ownerAccess && allShops === null) {
      fetchShops(ownerAccess.email, ownerAccess.secret);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerAccess]);

  // Actualisation automatique en arrière-plan pendant que cette page reste
  // ouverte — sans ça, un vendeur ajouté ou une licence changée ailleurs (sur
  // une entreprise, ou par un autre appareil) ne se voyait qu'après avoir
  // pensé à appuyer sur le bouton actualiser manuellement.
  useEffect(() => {
    if (!ownerAccess) return;
    const interval = setInterval(() => {
      fetchShops(ownerAccess.email, ownerAccess.secret, true);
    }, 20000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerAccess]);

  const submit = async () => {
    const em = email.trim().toLowerCase();
    const ok = await fetchShops(em, secret);
    if (ok) {
      onVerifyOwner({ email: em, secret });
      pushToast("Accès propriétaire vérifié", "ok");
    }
  };

  if (!ownerAccess) {
    return (
      <div>
        <h3 className="font-display font-bold text-base mb-3">Abonnement</h3>
        <div className="rounded-2xl border p-4" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={16} color="var(--glass)" />
            <p className="text-xs font-semibold">Page réservée au propriétaire de l'application</p>
          </div>
          <label className="text-xs font-semibold opacity-60 block mb-1.5">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="gb-focus w-full rounded-xl px-3 py-2 text-sm border mb-3" style={{ borderColor: "var(--line)" }} placeholder="email@exemple.com" />
          <label className="text-xs font-semibold opacity-60 block mb-1.5">{OWNER_SECURITY_QUESTION}</label>
          <input type="password" autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} className="gb-focus w-full rounded-xl px-3 py-2.5 text-sm border mb-4" style={{ borderColor: "var(--line)" }} placeholder="Réponse" />
          <button onClick={submit} disabled={loading} className="gb-focus w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: "var(--glass)" }}>
            {loading ? "Vérification…" : "Vérifier"}
          </button>
        </div>
      </div>
    );
  }

  const totals = (allShops || []).reduce((acc, s) => {
    acc.total += 1;
    if (s.subscription?.status === "active") acc.active += 1;
    else if (s.subscription?.status === "trial") acc.trial += 1;
    else acc.inactive += 1;
    return acc;
  }, { total: 0, trial: 0, active: 0, inactive: 0 });

  const filteredShops = (allShops || []).filter((s) => (s.name || "").toLowerCase().includes(search.trim().toLowerCase()));

  const deleteShop = async (shopId, shopName) => {
    if (!window.confirm(`Supprimer définitivement "${shopName}" et toutes ses données ? Cette action est irréversible.`)) return;
    try {
      await api.ownerDeleteShop({ email: ownerAccess.email, secret: ownerAccess.secret, shopId });
      pushToast("Entreprise supprimée", "ok");
      fetchShops(ownerAccess.email, ownerAccess.secret);
    } catch (e) {
      pushToast(e.message || "Erreur lors de la suppression", "error");
    }
  };

  // Un code PIN (vendeur ou administrateur) est stocké haché et ne peut donc
  // jamais être relu — seule une réinitialisation (génération d'un nouveau
  // code) est possible. Le nouveau code n'est affiché qu'une seule fois ici,
  // à charge pour le propriétaire de le transmettre à l'entreprise concernée.
  const resetAdminPin = async (shopId) => {
    if (!window.confirm("Générer un nouveau code administrateur pour cette entreprise ? L'ancien cessera de fonctionner immédiatement.")) return;
    try {
      const r = await api.ownerResetAdminPin({ email: ownerAccess.email, secret: ownerAccess.secret, shopId });
      setResetResult({ shopId, label: "Code administrateur", pin: r.newPin });
      pushToast("Nouveau code administrateur généré", "ok");
    } catch (e) {
      pushToast(e.message || "Erreur lors de la réinitialisation", "error");
    }
  };
  const resetVendorPin = async (shopId, vendorId, vendorName) => {
    if (!window.confirm(`Générer un nouveau code pour ${vendorName} ? L'ancien cessera de fonctionner immédiatement.`)) return;
    try {
      const r = await api.ownerResetVendorPin({ email: ownerAccess.email, secret: ownerAccess.secret, shopId, vendorId });
      setResetResult({ shopId, vendorId, label: `Code de ${vendorName}`, pin: r.newPin });
      pushToast("Nouveau code vendeur généré", "ok");
    } catch (e) {
      pushToast(e.message || "Erreur lors de la réinitialisation", "error");
    }
  };

  const onActivated = (shopId, subscription) => {
    setAllShops((prev) => (prev || []).map((s) => (s.id === shopId ? { ...s, subscription } : s)));
    setActivatingId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-base flex items-center gap-2"><CreditCard size={16} color="#185FA5" /> Abonnement</h3>
        <button onClick={() => fetchShops(ownerAccess.email, ownerAccess.secret)} disabled={loading} className="gb-focus flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "#E6F1FB", color: "#185FA5" }}>
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> {loading ? "…" : "Actualiser"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatCard icon={Store} label="Entreprises" value={totals.total} dark />
        <StatCard icon={Check} label="Actives" value={totals.active + totals.trial} tintBg="#EAF3DE" tintFg="#3B6D11" />
        <StatCard icon={AlertTriangle} label="Inactives" value={totals.inactive} tintBg={totals.inactive > 0 ? "#FCEBEB" : undefined} tintFg={totals.inactive > 0 ? "#A32D2D" : undefined} />
      </div>

      <div className="rounded-2xl p-3.5 mb-4 flex items-start gap-2.5" style={{ background: "#E1F5EE" }}>
        <ShieldCheck size={14} className="shrink-0 mt-0.5" color="#0F6E56" />
        <p className="text-[11px]" style={{ color: "#0F6E56" }}>Cette vue est connectée au serveur — elle liste <strong>toutes les entreprises créées sur tous les appareils</strong>, pas seulement celui-ci.</p>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute top-1/2 -translate-y-1/2 left-3.5 opacity-40" />
        <input
          className="gb-focus w-full rounded-full pl-10 pr-4 py-2.5 text-sm border"
          style={{ borderColor: "var(--line)", background: "var(--card)" }}
          placeholder="Rechercher une entreprise par nom…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <h3 className="font-display font-bold text-base mb-2">Toutes les entreprises ({filteredShops.length}{filteredShops.length !== (allShops || []).length ? ` / ${(allShops || []).length}` : ""})</h3>
      <div className="flex flex-col gap-2.5">
        {filteredShops.map((s) => {
          const typeLabel = ESTABLISHMENT_TYPES.find((t) => t.id === s.type)?.label || s.type || "";
          const sub = s.subscription || {};
          // "Actif" = essai en cours OU licence payante en cours ; tout le reste
          // (jamais activé, essai expiré, licence expirée) = "Inactif".
          const isTrialActive = sub.status === "trial";
          const isPaidActive = sub.status === "active";
          const isActive = isPaidActive || isTrialActive;
          const label = isPaidActive ? "ACTIF" : isTrialActive ? "ESSAI ACTIF" : sub.status === "expired" ? "EXPIRÉ" : "INACTIF";
          // Même code couleur que la barre de progression juste en dessous :
          // vert = licence payante active, orange = essai en cours, rouge =
          // expiré (ou jamais activé).
          const bg = isPaidActive ? "#EAF3DE" : isTrialActive ? "#FAEEDA" : "#FCEBEB";
          const fg = isPaidActive ? "#3B6D11" : isTrialActive ? "#854F0B" : "#A32D2D";
          const borderColor = isPaidActive ? "#97C459" : isTrialActive ? "#EF9F27" : sub.status === "expired" ? "#F09595" : "var(--line)";
          return (
            <div key={s.id} className="rounded-2xl p-3.5" style={{ border: `1px solid ${borderColor}`, background: "var(--card)" }}>
              <div className="flex items-center gap-3 mb-1.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><Store size={16} /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{s.name}</div>
                  <div className="text-xs opacity-50">{typeLabel} · {s.currency} · créée le {new Date(s.created_at).toLocaleDateString("fr-FR")}</div>
                </div>
                <span className="px-2 py-1 rounded-full text-[10px] font-bold shrink-0" style={{ background: bg, color: fg }}>{label}</span>
              </div>
              {sub.plan && (
                <div className="text-[10px] font-mono opacity-40 mb-1.5">
                  Plan : {sub.plan === "trial" ? "Essai gratuit" : (ACTIVATION_PLANS.find((p) => p.id === sub.plan)?.label || sub.plan)}
                  {sub.expiresAt ? ` · ${isActive ? "expire" : "a expiré"} le ${new Date(sub.expiresAt).toLocaleDateString("fr-FR")}` : ""}
                </div>
              )}
              {sub.activatedAt && sub.expiresAt && (() => {
                const totalMs = new Date(sub.expiresAt) - new Date(sub.activatedAt);
                const usedMs = Date.now() - new Date(sub.activatedAt);
                const pct = totalMs > 0 ? Math.min(100, Math.max(0, Math.round((usedMs / totalMs) * 100))) : 0;
                // Même code couleur que le badge de statut juste au-dessus :
                // vert = payante active, orange = essai en cours, rouge = expiré.
                const barColor = sub.status === "expired" ? "#E24B4A" : sub.isTrial ? "#EF9F27" : "#97C459";
                return (
                  <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: "var(--paper-dim)" }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                  </div>
                );
              })()}
              {sub.code && (
                <div className="text-[10px] font-mono opacity-60 mt-0.5">Code d'activation : {sub.code.match(/.{1,4}/g)?.join("-")}</div>
              )}
              {s.join_code && <div className="text-[10px] font-mono opacity-40 mt-0.5">Code d'invitation : {s.join_code}</div>}

              {s.vendors && s.vendors.length > 0 && (
                <div className="mt-2.5 pt-2.5" style={{ borderTop: "1px solid var(--line)" }}>
                  <p className="text-[10px] font-bold opacity-40 tracking-wide mb-1.5">VENDEURS ({s.vendors.length})</p>
                  <div className="flex flex-col gap-1.5">
                    {s.vendors.map((v) => (
                      <div key={v.id} className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate">{v.name}</div>
                          {v.joinCode && <div className="text-[10px] font-mono opacity-40 mt-0.5">Code de liaison : {v.joinCode}</div>}
                        </div>
                        <button onClick={() => resetVendorPin(s.id, v.id, v.name)} className="gb-focus text-[10px] font-semibold text-right shrink-0" style={{ color: "#185FA5" }}>Réinitialiser<br />le code PIN</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => resetAdminPin(s.id)} className="gb-focus text-[10px] font-semibold mt-2" style={{ color: "#185FA5" }}>Réinitialiser le code PIN administrateur (propriétaire)</button>
              {resetResult && resetResult.shopId === s.id && (
                <div className="rounded-xl p-2.5 mt-2 gb-slide-up" style={{ background: "#EAF3DE" }}>
                  <p className="text-[11px] font-semibold" style={{ color: "#27500A" }}>{resetResult.label} — nouveau code : <span className="font-mono text-sm tracking-widest">{resetResult.pin}</span></p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#27500A" }}>À transmettre à l'entreprise maintenant — il ne sera plus jamais réaffiché ici.</p>
                </div>
              )}

              {activatingId === s.id ? (
                <OwnerActivateForm shopId={s.id} ownerAccess={ownerAccess} pushToast={pushToast} onCancel={() => setActivatingId(null)} onActivated={(subscription) => onActivated(s.id, subscription)} />
              ) : (
                <div className="flex gap-2 mt-2.5">
                  <button onClick={() => setActivatingId(s.id)} className="gb-focus flex-1 rounded-xl py-2 text-xs font-semibold flex items-center justify-center gap-1.5" style={{ background: "#E6F1FB", color: "#185FA5" }}>
                    <KeyRound size={12} /> Activer une licence
                  </button>
                  <button onClick={() => deleteShop(s.id, s.name)} className="gb-focus px-3 rounded-xl py-2 text-[11px] font-semibold flex items-center justify-center gap-1.5 text-left leading-tight" style={{ background: "#FCEBEB", color: "#A32D2D" }}>
                    <Trash2 size={12} className="shrink-0" /> <span>Supprimer<br />l'entreprise</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {(!allShops || allShops.length === 0) && !loading && <p className="text-sm opacity-50 text-center py-6">Aucune entreprise enregistrée sur le serveur.</p>}
        {allShops && allShops.length > 0 && filteredShops.length === 0 && <p className="text-sm opacity-50 text-center py-6">Aucune entreprise ne correspond à « {search} ».</p>}
      </div>
    </div>
  );
}

function LicenseSection({ license, licenseStatus, onActivate, pushToast, shopName }) {
  const [showRenew, setShowRenew] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const plan = ACTIVATION_PLANS.find((p) => p.id === license?.planId);
  const isTrial = !license?.lifetime && !plan;
  // Durée totale réelle = écart entre activation et expiration, pas juste le
  // nombre de jours nominal du plan — sinon une licence prolongée (nouveau
  // code activé avant la fin de la précédente) affiche un total incohérent
  // avec le nombre de jours restants affiché juste à côté.
  const totalDays = license?.lifetime
    ? null
    : license?.activatedAt && license?.expiresAt
      ? Math.round((new Date(license.expiresAt) - new Date(license.activatedAt)) / MS_DAY)
      : plan ? plan.days : TRIAL_DAYS;
  const daysLeft = license && !license.lifetime && license.expiresAt ? Math.ceil((new Date(license.expiresAt) - Date.now()) / MS_DAY) : null;
  const daysUsed = totalDays !== null && daysLeft !== null ? Math.min(totalDays, Math.max(0, totalDays - daysLeft)) : null;
  const progressPct = totalDays && daysUsed !== null ? Math.min(100, Math.round((daysUsed / totalDays) * 100)) : 0;

  const STATUS_META = {
    lifetime: { label: "Licence à vie", color: "#1CA857", icon: Crown },
    active: { label: "Licence active", color: "#1CA857", icon: Check },
    expiring: { label: "Expire bientôt", color: "var(--cap)", icon: Clock },
    expired: { label: "Licence expirée", color: "var(--danger)", icon: AlertTriangle },
    none: { label: "Non activée", color: "var(--danger)", icon: AlertTriangle },
  };
  const meta = STATUS_META[licenseStatus] || STATUS_META.none;
  const StatusIcon = meta.icon;
  const barColor = licenseStatus === "expired" || licenseStatus === "none" ? "var(--danger)" : licenseStatus === "expiring" ? "var(--cap)" : "#1CA857";

  return (
    <div>
      <h3 className="font-display font-bold text-base mb-3">Licence de l'entreprise{shopName ? ` ${shopName}` : ""}</h3>

      <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--glass)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }}>
            <StatusIcon size={13} color={meta.color} strokeWidth={2.5} />
            <span className="text-[11px] font-bold text-white">{meta.label}</span>
          </div>
          {licenseStatus !== "lifetime" && (
            <button onClick={() => setShowPricing(true)} className="gb-focus flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold active:scale-95 transition-transform" style={{ background: "var(--cap)", color: "var(--glass)", boxShadow: "0 2px 8px rgba(0,0,0,0.18)" }}>
              <ShoppingCart size={12} strokeWidth={2.5} /> Acheter une licence
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 mb-1">
          {isTrial && <Gift size={16} color="#fff" className="opacity-80" />}
          <p className="font-display font-bold text-lg text-white">{license?.lifetime ? "Accès à vie" : plan ? plan.label : "Essai gratuit"}</p>
        </div>

        {!license?.lifetime && daysLeft !== null && (
          <>
            {daysLeft >= 0 ? (
              <p className="text-white/85 text-2xl font-display font-bold mt-1">
                {daysLeft}
                <span className="text-white/50 text-xs font-sans font-semibold ml-1.5">
                  jour{daysLeft > 1 ? "s" : ""} restant{daysLeft > 1 ? "s" : ""} sur {totalDays}
                </span>
              </p>
            ) : (
              <p className="text-xs mt-1 font-semibold" style={{ color: "#FF8A80" }}>
                Expirée depuis {Math.abs(daysLeft)} jour{Math.abs(daysLeft) > 1 ? "s" : ""}
              </p>
            )}

            <div className="h-1.5 rounded-full overflow-hidden mt-2.5 mb-3" style={{ background: "rgba(255,255,255,0.15)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${daysLeft >= 0 ? progressPct : 100}%`, background: daysLeft >= 0 ? "#fff" : "#FF8A80" }} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.08)" }}>
                <p className="text-white/50 text-[10px] mb-0.5">Plan activé</p>
                <p className="text-white text-[13px] font-semibold">{plan ? plan.label : "Essai gratuit"}</p>
              </div>
              {license?.activatedAt && (
                <div className="rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <p className="text-white/50 text-[10px] mb-0.5">Date d'activation</p>
                  <p className="text-white text-[13px] font-semibold">{new Date(license.activatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
              )}
              {daysUsed !== null && (
                <div className="rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <p className="text-white/50 text-[10px] mb-0.5">Jours écoulés</p>
                  <p className="text-white text-[13px] font-semibold">{daysUsed} jour{daysUsed > 1 ? "s" : ""}</p>
                </div>
              )}
              <div className="rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.08)" }}>
                <p className="text-white/50 text-[10px] mb-0.5">Jours restants</p>
                <p className="text-white text-[13px] font-semibold">{daysLeft >= 0 ? daysLeft : 0} jour{daysLeft > 1 ? "s" : ""}</p>
              </div>
              {license?.expiresAt && (
                <div className="rounded-xl px-3 py-2 col-span-2" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <p className="text-white/50 text-[10px] mb-0.5">{daysLeft >= 0 ? "Date d'expiration" : "A expiré le"}</p>
                  <p className="text-white text-[13px] font-semibold flex items-center gap-1.5"><CalendarCheck size={13} color={daysLeft >= 0 ? "#97C459" : "#FF8A80"} />{new Date(license.expiresAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
              )}
            </div>
          </>
        )}

        {license?.lifetime && license?.activatedAt && (
          <div className="rounded-xl px-3 py-2 mt-2" style={{ background: "rgba(255,255,255,0.08)" }}>
            <p className="text-white/50 text-[10px] mb-0.5">Activée le</p>
            <p className="text-white text-[13px] font-semibold">{new Date(license.activatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        )}
      </div>

      {licenseStatus === "expired" && (
        <div className="rounded-2xl p-3.5 mb-4 flex items-start gap-2.5" style={{ background: "#FCEBE8" }}>
          <AlertTriangle size={16} color="var(--danger)" className="shrink-0 mt-0.5" />
          <p className="text-xs" style={{ color: "var(--danger)" }}>Votre licence est expirée. Les nouvelles ventes sont bloquées jusqu'au renouvellement — le reste de l'application reste accessible.</p>
        </div>
      )}

      <button onClick={() => setShowRenew(true)} className="gb-focus w-full rounded-2xl py-3.5 font-semibold text-sm text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-transform" style={{ background: "linear-gradient(135deg, var(--cap), #C9770E)", boxShadow: "0 4px 14px -4px rgba(0,0,0,0.35)" }}>
        <KeyRound size={16} />
        {licenseStatus === "expired" || licenseStatus === "none" ? "Activer un nouveau code" : "Entrer un code pour prolonger"}
      </button>

      {showRenew && <RenewLicenseModal onActivate={onActivate} onClose={() => setShowRenew(false)} pushToast={pushToast} />}
      {showPricing && (
        <div className="fixed inset-0 z-50 overflow-y-auto no-print">
          <PricingScreen registeredAdmin={null} onClose={() => setShowPricing(false)} pushToast={pushToast} shopName={shopName} />
        </div>
      )}

      <div className="mt-5">
        <p className="text-xs font-semibold opacity-60 mb-2">Plans disponibles</p>
        <div className="flex flex-col gap-2">
          {ACTIVATION_PLANS.map((p) => {
            const pricing = LICENSE_PLANS_PRICING.find((lp) => lp.id === p.id) || {};
            const ICONS = { Zap, Rocket, Crown, Building2, Infinity };
            const PlanIcon = ICONS[pricing.icon] || Clock;
            const isLifetime = p.id === "lifetime";
            return (
              <div
                key={p.id}
                className={`relative flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 ${pricing.popular ? "gb-pulse" : ""}`}
                style={{
                  border: pricing.popular ? "2px solid var(--cap)" : "1px solid var(--line)",
                  background: isLifetime ? "#FBEAF0" : "var(--card)",
                }}
              >
                {pricing.popular && (
                  <span className="absolute -top-2.5 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--cap)", color: "var(--glass)" }}>Populaire</span>
                )}
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: isLifetime ? "var(--card)" : (pricing.iconBg || "var(--paper-dim)") }}>
                  <PlanIcon size={16} color={isLifetime ? "#993556" : (pricing.iconColor || "var(--ink)")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate mb-1" style={{ color: isLifetime ? "#993556" : "inherit" }}>{pricing.name || p.label}</p>
                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide" style={{ background: isLifetime ? "#993556" : pricing.popular ? (pricing.iconColor || "var(--glass)") : (pricing.iconBg || "var(--paper-dim)"), color: isLifetime || pricing.popular ? "#fff" : (pricing.iconColor || "var(--ink)") }}>{p.label.toUpperCase()}</span>
                  <p className="font-mono text-[10px] mt-1" style={{ color: isLifetime ? "#993556" : "var(--ink)", opacity: 0.4 }}>{p.code}-XXXXXXXXXX-X</p>
                </div>
                <div className="text-right shrink-0">
                  {pricing.price ? (
                    <>
                      <p className="text-[13px] font-bold" style={{ color: isLifetime ? "#993556" : "inherit" }}>{pricing.price.toLocaleString("fr-FR")} FCFA</p>
                      {pricing.oldPrice && <p className="text-[10px] opacity-40 line-through">{pricing.oldPrice.toLocaleString("fr-FR")} FCFA</p>}
                    </>
                  ) : (
                    <p className="text-[13px] font-bold" style={{ color: "#993556" }}>Sur devis</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AdminScreen({
  cashRegisterEntries, versements, activeCashSession, onRecordVersement,
  shop, saveShopMeta, shops, activeShopId, onSwitchShop, onCreateShop, onDeleteShop,
  products, saveProducts, categories, saveCategories, movements, saveMovements, inventories, saveInventories, sales, saveSales, suppliers, saveSuppliers, expenses, saveExpenses, vendors, saveVendors, clients, saveClients,
  license, licenseStatus, onActivateLicense, onRestoreBackup, ownerAccess, onVerifyOwner, pushToast,
  orders, saveOrders, supplierProducts, saveSupplierProducts, avoirs,
  menuOpen, setMenuOpen, pushNotification, onSectionChange,
  auditLog, requireAdmin, onRestoreServerBackup,
}) {
  const [section, setSection] = useState("stats");
  const [legalDoc, setLegalDoc] = useState(null);
  const activeSection = ADMIN_SECTIONS.find((s) => s.id === section);
  return (
    <div className="px-4 pt-4 pb-28">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <button onClick={() => setMenuOpen(true)} className="gb-focus w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }} aria-label="Ouvrir le menu d'administration">
            <ClipboardList size={16} />
          </button>
          <div>
            <h2 className="font-display font-bold text-lg leading-none">Administration</h2>
            <p className="text-xs opacity-50 mt-1 flex items-center gap-1">
              {activeSection?.Icon && <activeSection.Icon size={12} />} {activeSection?.label}
            </p>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-[15] flex no-print">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <div className="relative w-64 max-w-[80%] h-full flex flex-col gb-slide-in-left" style={{ background: "var(--glass)" }}>
            <div className="shrink-0 flex items-center gap-2.5 px-4 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.12)", paddingTop: "calc(max(22px, env(safe-area-inset-top)) + 60px)" }}>
              <div className="shrink-0" style={{ width: 32, height: 32 }}><GestiOneIcon size={32} /></div>
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm truncate">{shop.name}</p>
                <p className="text-white/50 text-[11px]">Administration</p>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto gb-scroll py-2 px-2.5" style={{ paddingBottom: "calc(96px + env(safe-area-inset-bottom))" }}>
              {ADMIN_SECTIONS.map((s, i) => (
                <div key={s.id}>
                  {s.group && ADMIN_SECTIONS[i - 1]?.group !== s.group && (
                    <p className="px-3 pt-3 pb-1 text-[10px] font-bold tracking-wide" style={{ color: "var(--cap)" }}>{s.group.toUpperCase()}</p>
                  )}
                  <button
                    onClick={() => { setSection(s.id); onSectionChange?.(s.id); setMenuOpen(false); }}
                    className="gb-focus w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left mb-0.5"
                    style={{ background: section === s.id ? "var(--cap)" : "transparent", color: section === s.id ? "var(--glass)" : "rgba(255,255,255,0.85)" }}
                  >
                    <s.Icon size={16} color={section === s.id ? "var(--glass)" : "rgba(255,255,255,0.75)"} />
                    <span className="text-sm" style={{ fontWeight: section === s.id ? 600 : 400 }}>{s.label}</span>
                  </button>
                </div>
              ))}
            </div>
            <div className="shrink-0 px-2.5 pt-1" style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}>
              <p className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-wide" style={{ color: "var(--cap)" }}>LÉGAL</p>
              <button onClick={() => { setLegalDoc("terms"); setMenuOpen(false); }} className="gb-focus w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left" style={{ color: "rgba(255,255,255,0.7)" }}>
                <FileText size={16} color="rgba(255,255,255,0.6)" />
                <span className="text-sm">Conditions d'utilisation</span>
              </button>
              <button onClick={() => { setLegalDoc("privacy"); setMenuOpen(false); }} className="gb-focus w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left" style={{ color: "rgba(255,255,255,0.7)" }}>
                <ShieldCheck size={16} color="rgba(255,255,255,0.6)" />
                <span className="text-sm">Politique de confidentialité</span>
              </button>
              <p className="px-3 pt-1 text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>Version 1.0 · GestiOne</p>
            </div>
            <button onClick={() => setMenuOpen(false)} className="gb-focus flex items-center gap-2.5 px-3 py-3 rounded-xl" style={{ position: "absolute", left: 10, right: 10, bottom: "calc(10px + env(safe-area-inset-bottom))", background: "var(--glass)", borderTop: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 -8px 16px -8px rgba(0,0,0,0.35)" }}>
              <X size={15} color="rgba(255,255,255,0.6)" />
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>Fermer</span>
            </button>
          </div>
        </div>
      )}
      {legalDoc && <LegalScreen doc={legalDoc} onSwitch={() => setLegalDoc(legalDoc === "terms" ? "privacy" : "terms")} onClose={() => setLegalDoc(null)} />}

      {section === "etablissement" && <EstablishmentSection shop={shop} saveShopMeta={saveShopMeta} pushToast={pushToast} />}
      {section === "securite" && <SecuritySection shop={shop} saveShopMeta={saveShopMeta} pushToast={pushToast} />}
      {section === "journal" && <ActivityLogSection shop={shop} auditLog={auditLog} pushToast={pushToast} />}
      {section === "abonnement" && <SubscriptionSection ownerAccess={ownerAccess} onVerifyOwner={onVerifyOwner} pushToast={pushToast} />}
      {section === "assistance" && <SupportInboxSection ownerAccess={ownerAccess} onVerifyOwner={onVerifyOwner} pushToast={pushToast} />}
      {section === "licence" && <LicenseSection license={license} licenseStatus={licenseStatus} onActivate={onActivateLicense} pushToast={pushToast} shopName={shop.name} />}
      {section === "boutiques" && <BoutiquesSection shops={shops} activeShopId={activeShopId} onSwitchShop={onSwitchShop} onCreateShop={onCreateShop} onDeleteShop={onDeleteShop} pushToast={pushToast} />}
      {section === "stats" && <StatsSection shop={shop} products={products} sales={sales} expenses={expenses} pushToast={pushToast} />}
      {section === "inventaire" && <InventorySection shop={shop} expenses={expenses} vendors={vendors} cashRegisterEntries={cashRegisterEntries} versements={versements} activeCashSession={activeCashSession} onRecordVersement={onRecordVersement} products={products} sales={sales} saveSales={saveSales} saveProducts={saveProducts} categories={categories} movements={movements} saveMovements={saveMovements} inventories={inventories} saveInventories={saveInventories} author={shop?.adminDisplayName?.trim() || "Administrateur"} pushToast={pushToast} pushNotification={pushNotification} />}
      {section === "produits" && <ProductsSection requireAdmin={requireAdmin} products={products} saveProducts={saveProducts} categories={categories} movements={movements} saveMovements={saveMovements} author={shop?.adminDisplayName?.trim() || "Administrateur"} pushToast={pushToast} pushNotification={pushNotification} />}
      {section === "categories" && <CategoriesSection categories={categories} saveCategories={saveCategories} products={products} pushToast={pushToast} />}
      {section === "fournisseurs" && <SuppliersSection suppliers={suppliers} saveSuppliers={saveSuppliers} expenses={expenses} saveExpenses={saveExpenses} products={products} saveProducts={saveProducts} categories={categories} saveCategories={saveCategories} movements={movements} saveMovements={saveMovements} orders={orders} saveOrders={saveOrders} supplierProducts={supplierProducts} saveSupplierProducts={saveSupplierProducts} pushToast={pushToast} pushNotification={pushNotification} shop={shop} />}
      {section === "export" && <AccountingExportSection shop={shop} sales={sales} expenses={expenses} products={products} versements={versements} pushToast={pushToast} />}
      {section === "depenses" && <ExpensesSection expenses={expenses} saveExpenses={saveExpenses} suppliers={suppliers} pushNotification={pushNotification} shop={shop} />}
      {section === "performance" && <VendorPerformanceSection shop={shop} sales={sales} vendors={vendors} saveShopMeta={saveShopMeta} />}
      {section === "vendeurs" && <VendorsSection vendors={vendors} saveVendors={saveVendors} pushToast={pushToast} adminPin={shop.adminPin} adminPinHash={shop.adminPinHash} backendLinked={shop.backendLinked} pushNotification={pushNotification} />}
      {section === "clients" && <ClientsSection clients={clients} saveClients={saveClients} sales={sales} shop={shop} pushToast={pushToast} />}
      {section === "donnees" && (
        <DataSection
          shop={shop}
          data={{ products, sales, categories, suppliers, expenses, movements, inventories, clients, vendors, orders, supplierProducts, avoirs, cashRegisterEntries, versements, shopSettings: (() => { const m = pickShopMeta(shop); delete m.name; return m; })() }}
          onRestore={onRestoreBackup}
          onRestoreServerBackup={onRestoreServerBackup}
          pushToast={pushToast}
        />
      )}
    </div>
  );
}

const ACCOUNT_DELETION_URL = "https://case-et-comptoir.vercel.app/delete-account";
const SUPPORT_FAQ = [
  { id: "delete", danger: true, group: "Compte et sécurité", q: "Comment supprimer définitivement mon compte ?" },
  { group: "Compte et sécurité", q: "J'ai oublié mon code PIN, comment le récupérer ?", a: "Contacte l'administrateur via ce chat en indiquant le nom de ton entreprise — il pourra vérifier ton identité et te renvoyer ton code." },
  { group: "Compte et sécurité", q: "Comment inviter un vendeur sur son propre téléphone ?", a: "Dans Admin → Entreprises, partage le code d'invitation à 7 caractères affiché sous le nom de ton entreprise." },
  { group: "Utilisation", q: "Comment ajouter un produit ?", a: "Va dans Admin → Produits → Ajouter, renseigne le nom, le code-barre, la catégorie et les prix." },
  { group: "Utilisation", q: "Comment activer les notifications vocales ?", a: "Touche la cloche en haut de l'écran, puis active « Notifications vocales ». Chaque vendeuse, vendeur ou administrateur règle son propre téléphone et choisit les actions annoncées." },
  { group: "Utilisation", q: "L'application ne se synchronise pas, que faire ?", a: "Vérifie ta connexion internet, puis appuie sur le badge ⏳ en haut de l'écran pour forcer une synchronisation manuelle." },
  { group: "Utilisation", q: "Comment changer la devise de mon entreprise ?", a: "Va dans Admin → Établissement, la devise peut être modifiée à tout moment." },
];

function openExternalUrl(url) {
  import("@capacitor/browser").then(({ Browser }) => Browser.open({ url })).catch(() => { try { window.open(url, "_blank", "noopener"); } catch { /* ignore */ } });
}

function SupportChatWidget({ shop }) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState(() => (localStorage.getItem("support_started") === "true" ? "thread" : "faq"));
  const [openFaq, setOpenFaq] = useState(null);
  const [faqQuery, setFaqQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(() => localStorage.getItem("support_name") || "");
  const [phone, setPhone] = useState(() => localStorage.getItem("support_phone") || "");
  const [email, setEmail] = useState(() => localStorage.getItem("support_email") || "");
  const [message, setMessage] = useState("");
  const [thread, setThread] = useState([]);
  const [sending, setSending] = useState(false);
  const threadEndRef = useRef(null);
  const started = localStorage.getItem("support_started") === "true";
  const tab = stage === "faq" ? "faq" : "chat";

  useEffect(() => {
    if (!open) return;
    const beat = () => api.supportHeartbeat({ name, phone, email, shopName: shop?.name }).catch(() => {});
    beat();
    const hbInterval = setInterval(beat, 20000);
    let pollInterval;
    if (stage === "thread") {
      const poll = () => api.supportPoll().then((d) => setThread(d.messages)).catch(() => {});
      poll();
      pollInterval = setInterval(poll, 5000);
    }
    return () => { clearInterval(hbInterval); if (pollInterval) clearInterval(pollInterval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stage]);

  useEffect(() => { threadEndRef.current?.scrollIntoView({ block: "end" }); }, [thread.length, stage, sending]);

  const submitContact = async () => {
    if (!name.trim() || !phone.trim() || !message.trim()) return;
    setSending(true);
    try {
      await api.supportSend({ name: name.trim(), phone: phone.trim(), email: email.trim(), shopName: shop?.name, message: message.trim() });
      localStorage.setItem("support_name", name.trim());
      localStorage.setItem("support_phone", phone.trim());
      localStorage.setItem("support_email", email.trim());
      localStorage.setItem("support_started", "true");
      setMessage("");
      setStage("thread");
    } catch { /* réessai possible, on reste sur le formulaire */ }
    setSending(false);
  };

  const sendMore = async (text) => {
    const body = (text ?? message).trim();
    if (!body) return;
    setSending(true);
    try {
      await api.supportSend({ name, phone, email, shopName: shop?.name, message: body });
      if (text === undefined) setMessage("");
      const d = await api.supportPoll();
      setThread(d.messages);
    } catch { /* hors-ligne — réessayer plus tard */ }
    setSending(false);
  };

  const copyLink = () => {
    try { navigator.clipboard?.writeText(ACCOUNT_DELETION_URL); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const qn = faqQuery.trim().toLowerCase();
  const faqItems = SUPPORT_FAQ.map((item, i) => ({ ...item, i })).filter((f) => !qn || f.q.toLowerCase().includes(qn) || (f.a || "supprimer suppression compte").toLowerCase().includes(qn));
  const faqGroups = [...new Set(faqItems.map((f) => f.group))];
  const fmtTime = (d) => { const t = d ? new Date(d) : null; return t && !isNaN(t) ? t.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""; };
  const inputCls = "gb-focus w-full rounded-xl px-3 text-[14.5px] border min-h-[42px]";

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} className="gb-focus gb-pulse fixed right-4 z-40 w-14 h-14 rounded-2xl flex items-center justify-center active:scale-95 transition-transform" style={{ background: "#1F2A33", boxShadow: "0 10px 24px rgba(22,32,42,0.35)", bottom: "calc(6rem + env(safe-area-inset-bottom))" }} aria-label="Assistance">
          <MessageCircle size={24} color="#fff" strokeWidth={2.2} />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2" style={{ background: "#5CC98A", borderColor: "var(--paper)" }} />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 no-print" style={{ pointerEvents: "none" }}>
          <div className="absolute inset-0" style={{ background: "rgba(22,32,42,0.18)", pointerEvents: "auto" }} onClick={() => setOpen(false)} />
          <div role="dialog" aria-label="Assistance GestiOne" className="absolute rounded-[22px] overflow-hidden flex flex-col gb-pop" style={{ pointerEvents: "auto", right: "max(12px, env(safe-area-inset-right))", bottom: "calc(92px + env(safe-area-inset-bottom))", width: "min(320px, calc(100vw - 56px))", height: "min(580px, calc(100vh - 170px - env(safe-area-inset-top) - env(safe-area-inset-bottom)))", background: tab === "chat" ? "#EFEDE7" : "#F4F3EF", color: "#16202A", boxShadow: "0 20px 44px rgba(22,32,42,0.32)", border: "1px solid rgba(22,32,42,0.08)" }}>
            <div className="px-3.5 pt-3 pb-3 flex flex-col gap-2.5 shrink-0" style={{ background: "#1F2A33" }}>
              <div className="flex items-center gap-2.5">
                <div className="relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#2F6F5E" }}>
                  <Headphones size={17} color="#fff" />
                  <span className="absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 rounded-full border-2" style={{ background: "#5CC98A", borderColor: "#1F2A33" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-[14.5px] leading-tight truncate">Assistance GestiOne</p>
                  <p className="text-[11.5px] mt-0.5 truncate" style={{ color: "#C9D1D8" }}>{sending ? "Envoi en cours…" : "En ligne · réponse rapide"}</p>
                </div>
                <button onClick={() => setOpen(false)} className="gb-focus w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.1)" }} aria-label="Fermer l'assistance"><X size={17} color="#fff" /></button>
              </div>
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.08)" }}>
                {[{ id: "faq", label: "Questions" }, { id: "chat", label: "Discussion" }].map((t) => (
                  <button key={t.id} onClick={() => setStage(t.id === "faq" ? "faq" : (started ? "thread" : "form"))} className="gb-focus flex-1 min-h-[34px] rounded-[9px] text-[13px] font-bold whitespace-nowrap" style={{ background: tab === t.id ? "#fff" : "transparent", color: tab === t.id ? "#16202A" : "#C9D1D8" }}>{t.label}</button>
                ))}
              </div>
            </div>

            {stage === "faq" && (
              <>
              <div className="flex-1 min-h-0 overflow-y-auto gb-scroll px-3 pt-3 pb-4 flex flex-col gap-2.5">
                <label className="flex items-center gap-2 min-h-[42px] px-3 rounded-xl border" style={{ background: "#fff", borderColor: "#DAD8D0" }}>
                  <Search size={17} color="#5B6470" />
                  <input value={faqQuery} onChange={(e) => setFaqQuery(e.target.value)} placeholder="Rechercher une question" aria-label="Rechercher dans la FAQ" className="flex-1 min-w-0 bg-transparent outline-none text-[15px]" />
                </label>
                {faqItems.length === 0 && <p className="text-sm text-center py-6" style={{ color: "#5B6470" }}>Aucune question ne correspond.</p>}
                {faqGroups.map((g) => (
                  <section key={g} className="flex flex-col gap-2">
                    <span className="text-[12px] font-bold uppercase tracking-wide px-0.5 pt-1" style={{ color: "#4A525C" }}>{g}</span>
                    <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid #E3E1DA" }}>
                      {faqItems.filter((f) => f.group === g).map((f, idx) => {
                        const isOpen = openFaq === f.i;
                        return (
                          <div key={f.i} style={{ borderTop: idx ? "1px solid #EFEDE7" : "none", background: isOpen && f.danger ? "#FFFCFB" : "transparent" }}>
                            <button onClick={() => setOpenFaq(isOpen ? null : f.i)} aria-expanded={isOpen} className="gb-focus w-full min-h-[48px] px-3 py-2.5 flex items-center gap-2.5 text-left">
                              <span className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: f.danger ? "#FBE4E1" : "#E6EEFA" }}>
                                {f.danger ? <UserMinus size={15} color="#B3261E" /> : <HelpCircle size={15} color="#1D4E89" />}
                              </span>
                              <span className="flex-1 min-w-0 text-[13.5px] font-bold leading-snug break-words">{f.q}</span>
                              <ChevronDown size={16} color="#5B6470" className="shrink-0" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                            </button>
                            {isOpen && !f.danger && <p className="px-3 pb-3 pl-[54px] text-[13px] leading-relaxed" style={{ color: "#3D4550" }}>{f.a}</p>}
                            {isOpen && f.danger && (
                              <div className="px-3.5 pb-4 flex flex-col gap-3">
                                <p className="text-[13.5px] leading-relaxed" style={{ color: "#3D4550" }}>Le propriétaire (administrateur) peut demander à tout moment la suppression définitive de son entreprise et de toutes les données associées.</p>
                                <ol className="flex flex-col gap-2.5">
                                  {[
                                    "Depuis l'application : connectez-vous avec le code administrateur, ouvrez Admin › Établissements, choisissez l'entreprise puis confirmez la suppression. L'opération est immédiate.",
                                    "Sans accès à l'application (téléphone perdu, application désinstallée) : ouvrez le lien de suppression ci-dessous et suivez la procédure.",
                                    "La demande est traitée après vérification de votre identité, avec le nom de l'entreprise concernée.",
                                  ].map((t, n) => (
                                    <li key={n} className="flex gap-2.5 items-start">
                                      <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[12.5px] font-bold text-white" style={{ background: "#1F2A33" }}>{n + 1}</span>
                                      <span className="text-[13.5px] leading-relaxed">{t}</span>
                                    </li>
                                  ))}
                                </ol>
                                <div className="flex gap-2.5 p-3 rounded-2xl" style={{ background: "#FDF0EE", border: "1px solid #F2C4BC" }}>
                                  <AlertTriangle size={19} color="#B3261E" className="shrink-0" />
                                  <span className="text-[13px] leading-relaxed" style={{ color: "#7A2016" }}><b>Action irréversible.</b> Produits, ventes, stock, clients, crédits, avoirs et comptes vendeurs sont effacés définitivement. Exportez vos rapports avant.</span>
                                </div>
                                <div className="flex flex-col gap-1 px-3 py-2.5 rounded-xl" style={{ background: "#F6F5F1", border: "1px solid #E3E1DA" }}>
                                  <span className="text-[11.5px] font-bold" style={{ color: "#5B6470" }}>Lien de suppression du compte</span>
                                  <span className="text-[13.5px] font-semibold break-all" style={{ color: "#1D4E89" }}>{ACCOUNT_DELETION_URL.replace("https://", "")}</span>
                                </div>
                                <div className="grid gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                                  <button onClick={() => openExternalUrl(ACCOUNT_DELETION_URL)} className="gb-focus min-h-[50px] px-3 rounded-2xl text-white text-[14.5px] font-bold flex items-center justify-center gap-2" style={{ background: "#B3261E" }}><ExternalLink size={17} /> Demander la suppression</button>
                                  <button onClick={copyLink} className="gb-focus min-h-[50px] px-3.5 rounded-2xl text-[14px] font-bold flex items-center gap-1.5" style={{ background: "#fff", border: "1px solid #DAD8D0" }}>{copied ? <Check size={16} color="#1E8E50" /> : <Copy size={16} />}{copied ? "Copié" : "Copier"}</button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
              <div className="shrink-0 px-3 py-2.5 flex items-center gap-2.5" style={{ background: "#fff", borderTop: "1px solid #E3E1DA" }}>
                <span className="flex-1 min-w-0 text-[12.5px] leading-snug whitespace-nowrap overflow-hidden" style={{ color: "#3D4550", textOverflow: "ellipsis" }}>Besoin d'aide ?</span>
                <button onClick={() => setStage(started ? "thread" : "form")} className="gb-focus shrink-0 min-h-[40px] px-3 rounded-xl text-white text-[13px] font-bold flex items-center gap-1.5" style={{ background: "#1F2A33" }}><MessageCircle size={15} /> Écrire au support</button>
              </div>
              </>
            )}

            {stage === "form" && (
              <>
              <div className="flex-1 min-h-0 overflow-y-auto gb-scroll px-3 pt-3 pb-4 flex flex-col gap-2.5">
                <div className="flex gap-2 p-2.5 rounded-xl" style={{ background: "#fff", border: "1px solid #E3E1DA" }}>
                  <Lock size={16} color="#2F6F5E" className="shrink-0" />
                  <span className="text-[12px] leading-relaxed" style={{ color: "#3D4550" }}>Conversation privée avec l'équipe GestiOne. Ne partagez jamais votre code PIN.</span>
                </div>
                <p className="text-[13px] font-bold">Vos coordonnées</p>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom" className={inputCls} style={{ borderColor: "#DAD8D0", background: "#fff" }} />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Numéro de téléphone" inputMode="tel" className={inputCls} style={{ borderColor: "#DAD8D0", background: "#fff" }} />
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail (facultatif)" inputMode="email" className={inputCls} style={{ borderColor: "#DAD8D0", background: "#fff" }} />
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Décrivez votre question ou votre problème…" rows={3} className="gb-focus w-full rounded-xl px-3 py-2.5 text-[14.5px] border resize-none" style={{ borderColor: "#DAD8D0", background: "#fff" }} />
              </div>
              <div className="shrink-0 px-3 py-2.5" style={{ background: "#fff", borderTop: "1px solid #E3E1DA" }}>
                <button onClick={submitContact} disabled={sending || !name.trim() || !phone.trim() || !message.trim()} className="gb-focus w-full min-h-[46px] rounded-xl text-[14.5px] font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: "#1E8E50" }}>
                  <Send size={16} /> {sending ? "Envoi…" : "Envoyer au support"}
                </button>
              </div>
              </>
            )}

            {stage === "thread" && (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto gb-scroll px-3.5 pt-3.5 pb-2.5 flex flex-col gap-2.5">
                  <span className="self-center px-3 py-1 rounded-full text-[12px] font-bold" style={{ background: "#E2E0D9", color: "#3D4550" }}>Conversation</span>
                  <div className="flex gap-2 p-2.5 rounded-xl" style={{ background: "#fff", border: "1px solid #E3E1DA" }}>
                    <Lock size={15} color="#2F6F5E" className="shrink-0" />
                    <span className="text-[11.5px] leading-relaxed" style={{ color: "#3D4550" }}>Conversation privée avec l'équipe GestiOne. Ne partagez jamais votre code PIN.</span>
                  </div>
                  {thread.length === 0 && (
                    <div className="flex items-end gap-2 pr-9">
                      <span className="w-[30px] h-[30px] rounded-[10px] flex items-center justify-center shrink-0 text-white text-[12px] font-bold" style={{ background: "#2F6F5E" }}>G</span>
                      <div className="px-3 py-2 rounded-2xl rounded-bl-[4px] text-[13.5px] leading-relaxed" style={{ background: "#fff", border: "1px solid #E3E1DA" }}>Message bien reçu. Un conseiller vous répond ici même.</div>
                    </div>
                  )}
                  {thread.map((m, idx) => {
                    const agent = m.sender === "owner";
                    const prev = thread[idx - 1];
                    return (
                      <div key={m.id} className={`flex items-end gap-2 gb-slide-up ${agent ? "pr-9" : "pl-11 justify-end"}`}>
                        {agent && <span className="w-[30px] h-[30px] rounded-[10px] flex items-center justify-center shrink-0 text-white text-[12px] font-bold" style={{ background: "#2F6F5E" }}>G</span>}
                        <div className={`min-w-0 max-w-full px-3 pt-2.5 pb-2 flex flex-col gap-1 ${agent ? "rounded-2xl rounded-bl-[4px]" : "rounded-2xl rounded-br-[4px]"}`} style={agent ? { background: "#fff", border: "1px solid #E3E1DA", color: "#16202A" } : { background: "#1F2A33", color: "#fff" }}>
                          {agent && (!prev || prev.sender !== "owner") && <span className="text-[12px] font-bold" style={{ color: "#2F6F5E" }}>Équipe GestiOne</span>}
                          <span className="text-[13.5px] leading-relaxed whitespace-pre-line break-words">{m.body}</span>
                          <span className="self-end flex items-center gap-1 text-[11px] font-semibold" style={{ color: agent ? "#6B747E" : "#B7C0C8" }}>
                            {fmtTime(m.created_at)}
                            {!agent && <Check size={12} color="#7FD6C2" />}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {sending && (
                    <div className="self-end flex items-center gap-1 px-3.5 py-3 rounded-2xl" style={{ background: "#1F2A33" }}>
                      {[0, 0.15, 0.3].map((d) => <span key={d} className="w-1.5 h-1.5 rounded-full" style={{ background: "#fff", opacity: 0.6, animation: `gb-blink 1s ease-in-out infinite ${d}s` }} />)}
                    </div>
                  )}
                  <div ref={threadEndRef} />
                </div>
                <div className="px-3 pt-2 pb-0.5 flex flex-wrap gap-1.5 shrink-0" style={{ background: "#EFEDE7" }}>
                  {["Impression", "Licence", "Synchro"].map((q) => (
                    <button key={q} onClick={() => sendMore(`J'ai une question : ${q.toLowerCase()}`)} disabled={sending} className="gb-focus shrink-0 min-h-[32px] px-2.5 rounded-full text-[12px] font-bold whitespace-nowrap disabled:opacity-50" style={{ background: "#fff", border: "1px solid #C6D9D2", color: "#1F4F43" }}>{q}</button>
                  ))}
                </div>
                <div className="px-3 pt-2 pb-2.5 flex items-end gap-2 shrink-0" style={{ background: "#fff", borderTop: "1px solid #E3E1DA" }}>
                  <label className="flex-1 min-w-0 min-h-[46px] px-3.5 rounded-2xl border flex items-center" style={{ background: "#fff", borderColor: "#DAD8D0" }}>
                    <input value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMore()} placeholder="Écrivez votre message…" aria-label="Votre message" className="flex-1 min-w-0 bg-transparent outline-none text-[15px]" />
                  </label>
                  <button onClick={() => sendMore()} disabled={sending || !message.trim()} aria-label="Envoyer" className="gb-focus w-[46px] h-[46px] rounded-2xl flex items-center justify-center shrink-0" style={{ background: message.trim() ? "#1E8E50" : "#D9DCDF", color: message.trim() ? "#fff" : "#6B747E" }}><Send size={19} /></button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function GlobalSearchModal({ products, clients, categories, sales, avoirs, expenses, role, view, adminSection, onClose }) {
  const fmt = useFmt();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  // La recherche de l'en-tête s'adapte à l'écran en cours : sur l'historique
  // des ventes elle cherche des ventes, sur Crédit/Avoir elle cherche des
  // crédits et des avoirs, sur Dépenses elle cherche des dépenses — que ce
  // soit l'onglet direct du vendeur, ou la sous-section Admin > Dépenses
  // pour l'administrateur — sinon (Vendre, Stock) elle garde la recherche
  // générale produits/clients.
  const context = view === "history" ? "sales" : view === "credits" ? "credits" : (view === "expenses" || (view === "admin" && adminSection === "depenses")) ? "expenses" : "catalog";

  const matchedProducts = context === "catalog" && q ? products.filter((p) => p.name.toLowerCase().includes(q) || p.barcode?.includes(q)).slice(0, 8) : [];
  const matchedClients = context === "catalog" && q && role === "admin" ? (clients || []).filter((c) => c.name.toLowerCase().includes(q) || c.phone?.includes(q)).slice(0, 8) : [];

  const matchedSales = context === "sales" && q ? (sales || []).filter((s) => receiptNumber(s.id).includes(q) || (s.clientName || "").toLowerCase().includes(q) || s.vendor.toLowerCase().includes(q) || (s.items || []).some((i) => i.product?.name?.toLowerCase().includes(q))).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 15) : [];

  const matchedCredits = context === "credits" && q ? (sales || []).filter((s) => s.paymentMethod === "credit" && (s.clientName || "").toLowerCase().includes(q)).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10) : [];
  const matchedAvoirs = context === "credits" && q ? (avoirs || []).filter((a) => (a.clientName || "").toLowerCase().includes(q)).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10) : [];

  const matchedExpenses = context === "expenses" && q ? (expenses || []).filter((e) => (e.label || "").toLowerCase().includes(q) || (e.supplier || "").toLowerCase().includes(q)).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 15) : [];

  const hasResults = matchedProducts.length > 0 || matchedClients.length > 0 || matchedSales.length > 0 || matchedCredits.length > 0 || matchedAvoirs.length > 0 || matchedExpenses.length > 0;
  const placeholder = context === "sales" ? "Rechercher une vente (n°, client, produit…)" : context === "credits" ? "Rechercher un crédit ou un avoir (client)" : context === "expenses" ? "Rechercher une dépense" : `Rechercher un produit${role === "admin" ? ", un client" : ""}…`;
  const emptyHint = context === "sales" ? "Tape un numéro de reçu, un nom de client ou de produit…" : context === "credits" ? "Tape le nom d'un client…" : context === "expenses" ? "Tape le libellé d'une dépense…" : `Tape un nom de produit${role === "admin" ? " ou de client" : ""}…`;

  return (
    <div className="fixed inset-0 z-[85] flex flex-col no-print" style={{ background: "var(--paper)" }}>
      <div className="px-4 pb-3 flex items-center gap-2.5 sticky top-0" style={{ background: "var(--paper)", paddingTop: "max(20px, env(safe-area-inset-top))" }}>
        <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--paper-dim)" }}>
          <Search size={16} className="opacity-50" />
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} className="bg-transparent outline-none text-sm flex-1 min-w-0" />
        </div>
        <button onClick={onClose} className="gb-focus w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><X size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto gb-scroll px-4 pb-6">
        {!q && <p className="text-sm opacity-40 text-center py-10">{emptyHint}</p>}
        {q && !hasResults && <p className="text-sm opacity-40 text-center py-10">Aucun résultat pour "{query}".</p>}

        {matchedSales.length > 0 && (
          <div className="flex flex-col gap-2 mt-2">
            {matchedSales.map((s) => (
              <div key={s.id} className="rounded-xl p-3 border flex items-center justify-between" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">N° {receiptNumber(s.id)} · {s.vendor}</div>
                  <div className="text-[11px] opacity-50">{new Date(s.date).toLocaleDateString("fr-FR")}{s.clientName ? ` · ${s.clientName}` : ""}</div>
                </div>
                <div className="text-sm font-mono font-bold shrink-0 ml-2">{fmt(s.total)}</div>
              </div>
            ))}
          </div>
        )}

        {matchedCredits.length > 0 && (
          <>
            <p className="text-[11px] font-semibold opacity-50 mb-2 mt-2">Crédits</p>
            <div className="flex flex-col gap-2 mb-5">
              {matchedCredits.map((s) => (
                <div key={s.id} className="rounded-xl p-3 border flex items-center justify-between" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{s.clientName}</div>
                    <div className="text-[11px] opacity-50">{s.paid ? "Soldé" : "En cours"} · {new Date(s.date).toLocaleDateString("fr-FR")}</div>
                  </div>
                  <div className="text-sm font-mono font-bold shrink-0 ml-2">{fmt(s.total - creditPaidSoFar(s))}</div>
                </div>
              ))}
            </div>
          </>
        )}
        {matchedAvoirs.length > 0 && (
          <>
            <p className="text-[11px] font-semibold opacity-50 mb-2">Avoirs</p>
            <div className="flex flex-col gap-2">
              {matchedAvoirs.map((a) => (
                <div key={a.id} className="rounded-xl p-3 border flex items-center justify-between" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{a.clientName}</div>
                    <div className="text-[11px] opacity-50">{a.settled ? "Soldé" : "En cours"} · {a.type === "produit" ? "Avoir produit" : "Avoir monnaie"}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {matchedExpenses.length > 0 && (
          <div className="flex flex-col gap-2 mt-2">
            {matchedExpenses.map((e) => (
              <div key={e.id} className="rounded-xl p-3 border flex items-center justify-between" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{e.label}</div>
                  <div className="text-[11px] opacity-50">{new Date(e.date).toLocaleDateString("fr-FR")}{e.supplier ? ` · ${e.supplier}` : ""}</div>
                </div>
                <div className="text-sm font-mono font-bold shrink-0 ml-2">{fmt(e.amount)}</div>
              </div>
            ))}
          </div>
        )}

        {matchedProducts.length > 0 && (
          <>
            <p className="text-[11px] font-semibold opacity-50 mb-2 mt-2">Produits</p>
            <div className="flex flex-col gap-2 mb-5">
              {matchedProducts.map((p) => (
                <div key={p.id} className="rounded-xl p-3 border flex items-center gap-3" style={{ borderColor: p.stock <= p.minStock ? "var(--danger)" : "var(--line)", background: "var(--card)" }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><CategoryIcon cat={p.category} categories={categories} size={16} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-[11px] opacity-50 font-mono">{fmt(p.price)} · stock {p.stock}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {matchedClients.length > 0 && (
          <>
            <p className="text-[11px] font-semibold opacity-50 mb-2">Clients</p>
            <div className="flex flex-col gap-2">
              {matchedClients.map((c) => (
                <div key={c.id} className="rounded-xl p-3 border flex items-center gap-3" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--paper-dim)" }}><Users size={16} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{c.name}</div>
                    <div className="text-[11px] opacity-50 font-mono">{c.phone || "Pas de téléphone"}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] opacity-40 mt-3">Ouvre Admin → Clients pour voir la fiche complète.</p>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- App racine ---------- */

// Carte "Notifications vocales" affichée en haut du panneau de notifications
// pour TOUTE personne connectée. Réglage propre à l'appareil.
function VoiceSettingsCard({ prefs, onChange, expanded, onToggleExpanded }) {
  const on = !!prefs.enabled;
  const activeCount = VOICE_EVENT_TYPES.filter((e) => prefs.types[e.id] !== false).length;
  const allOn = activeCount === VOICE_EVENT_TYPES.length;
  const Switch = ({ checked, onClick, label, big }) => (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onClick}
      className="gb-focus shrink-0 rounded-full flex items-center transition-colors"
      style={{ width: big ? 52 : 44, height: big ? 30 : 26, padding: 3, background: checked ? "#1E8E50" : "#C9CDD2", justifyContent: checked ? "flex-end" : "flex-start" }}>
      <span className="rounded-full bg-white" style={{ width: big ? 24 : 20, height: big ? 24 : 20, boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }} />
    </button>
  );
  const test = () => { voiceVolume = prefs.volume; speak("Nouvelle vente de 3 500 francs.", true); };
  return (
    <div className="m-3 rounded-2xl p-3" style={{ background: on ? "#EAF6EF" : "var(--paper-dim)", border: `1px solid ${on ? "#C6E6D2" : "var(--line)"}` }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: on ? "#1E8E50" : "var(--card)" }}>
          <Volume2 size={19} color={on ? "#fff" : "var(--ink)"} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight">Notifications vocales</p>
          <p className="text-[11px] opacity-60 mt-0.5 leading-snug">{on ? `Activées sur ce téléphone · ${activeCount} type${activeCount > 1 ? "s" : ""} d'actions` : "Désactivées sur ce téléphone"}</p>
        </div>
        <Switch big checked={on} label="Activer les notifications vocales" onClick={() => { const next = { ...prefs, enabled: !on }; onChange(next); if (!on) { voiceVolume = next.volume; speak("Notifications vocales activées.", true); } }} />
      </div>
      {on && (
        <>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button onClick={test} className="gb-focus flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-white min-h-[40px]" style={{ background: "#1E8E50" }}><Play size={13} fill="#fff" /> Tester</button>
            <button onClick={onToggleExpanded} className="gb-focus flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold min-h-[40px]" style={{ background: "var(--card)", color: "#0F4F2B", border: "1px solid #C6E6D2" }}>
              Réglages <ChevronDown size={13} style={{ transform: expanded ? "rotate(180deg)" : "none" }} />
            </button>
          </div>
          {expanded && (
            <div className="mt-3 flex flex-col gap-3 gb-slide-up">
              <label className="flex flex-col gap-1">
                <span className="flex justify-between text-xs font-bold"><span>Volume</span><span style={{ color: "#0F4F2B" }}>{Math.round(prefs.volume * 100)} %</span></span>
                <input type="range" min="10" max="100" step="10" value={Math.round(prefs.volume * 100)} onChange={(e) => onChange({ ...prefs, volume: Number(e.target.value) / 100 })} style={{ accentColor: "#1E8E50" }} aria-label="Volume de la voix" />
              </label>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wide opacity-70">Annoncer à voix haute</span>
                <button onClick={() => { const t = {}; VOICE_EVENT_TYPES.forEach((e) => { t[e.id] = !allOn; }); onChange({ ...prefs, types: t }); }} className="gb-focus text-[11px] font-bold underline" style={{ color: "#0F4F2B" }}>{allOn ? "Tout désactiver" : "Tout activer"}</button>
              </div>
              <div className="rounded-xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>
                {VOICE_EVENT_TYPES.map((e, i) => {
                  const checked = prefs.types[e.id] !== false;
                  return (
                    <div key={e.id} className="flex items-center gap-2.5 px-3 py-2.5" style={{ borderTop: i ? "1px solid var(--line)" : "none" }}>
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: e.fg }} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-bold leading-tight">{e.label}</span>
                        <span className="block text-[10.5px] opacity-55 leading-snug">{e.desc}</span>
                      </span>
                      <Switch checked={checked} label={e.label} onClick={() => onChange({ ...prefs, types: { ...prefs.types, [e.id]: !checked } })} />
                    </div>
                  );
                })}
              </div>
              <p className="text-[10.5px] leading-snug opacity-60">Disponible pour toute personne connectée. Réglage propre à ce téléphone : gardez le volume du téléphone activé.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const TABS = {
  vendeur: [{ id: "sell", label: "Vendre", Icon: ScanLine }, { id: "stock", label: "Stock", Icon: Boxes }, { id: "credits", label: "Position", Icon: Scale }, { id: "history", label: "Historique", Icon: History }, { id: "expenses", label: "Dépenses", Icon: Wallet }],
  admin: [{ id: "sell", label: "Vendre", Icon: ScanLine }, { id: "stock", label: "Stock", Icon: Boxes }, { id: "credits", label: "Position", Icon: Scale }, { id: "history", label: "Historique", Icon: History }, { id: "admin", label: "Admin", Icon: ShieldCheck }],
};

// Filet de sécurité global : sans cette classe, une erreur JS inattendue
// pendant un rendu (donnée corrompue, action réseau qui échoue de façon
// synchrone, etc.) démonte tout l'arbre React et laisse un écran totalement
// blanc, sans aucun moyen de revenir en arrière. Avec elle, on affiche un
// écran de récupération avec un bouton pour relancer l'app.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error("GestiOne — erreur interceptée :", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: "#0E3B2A" }}>
          <div className="w-14 h-14 rounded-2xl mb-5 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
            <AlertTriangle size={26} color="#E8A33D" />
          </div>
          <p className="font-display font-bold text-lg text-white mb-2">Un problème est survenu</p>
          <p className="text-white/60 text-sm max-w-[280px] mb-6">L'écran n'a pas pu s'afficher correctement. Vos données restent enregistrées — relance simplement l'application.</p>
          <button onClick={() => this.setState({ hasError: false })} className="rounded-2xl py-3 px-6 font-semibold text-sm" style={{ background: "#E8A33D", color: "#0E3B2A" }}>
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppInner() {
  const [role, setRole] = useState(null);
  const [currentVendorName, setCurrentVendorName] = useState("");
  const [locked, setLocked] = useState(() => { try { return localStorage.getItem("sessionLocked") === "1"; } catch { return false; } });
  const [adminGuard, setAdminGuard] = useState(null);
  const lastActivityRef = useRef(Date.now());
  const unlockFailsRef = useRef(0);
  const [view, setView] = useState("sell");

  useEffect(() => {
    if (role) window.storage.set("sessionView", JSON.stringify(view)).catch(() => {});
  }, [view, role]);
  const [shops, setShops] = useState(undefined); // undefined = chargement, [] = aucune entreprise (configuration requise)
  const [activeShopId, setActiveShopId] = useState(null);
  const [products, setProducts] = useState(null);
  const [sales, setSales] = useState(null);
  const [vendors, setVendors] = useState(null);
  const [suppliers, setSuppliers] = useState(null);
  const [expenses, setExpenses] = useState(null);
  const [orders, setOrders] = useState(null);
  const [supplierProducts, setSupplierProducts] = useState(null);
  const [avoirs, setAvoirs] = useState([]);
  const [cashRegisterEntries, setCashRegisterEntries] = useState([]);
  const [versements, setVersements] = useState([]);
  // Journal d'activité : on ne fait qu'ajouter (le serveur refuse aussi
  // toute suppression ou modification d'une ligne déjà enregistrée).
  const [auditLog, setAuditLog] = useState([]);
  const auditRef = useRef([]);
  // Fenêtre "fond de caisse" affichée au centre : ouverte automatiquement à
  // l'entrée sur Vendre (ou au démarrage) tant qu'aucun montant n'a été
  // renseigné pour AUJOURD'HUI, et redéclenchée si on tente une vente sans
  // l'avoir fait.
  const [cashRegisterModalOpen, setCashRegisterModalOpen] = useState(false);
  // Devient true dès que la première tentative de synchronisation du fond de
  // caisse avec le serveur s'est terminée (succès ou échec) pour la boutique
  // active — évite d'afficher la fenêtre de saisie à un vendeur (ou à
  // l'administrateur) alors que le montant a peut-être déjà été renseigné par
  // quelqu'un d'autre mais que la copie locale de cet appareil ne le sait pas
  // encore. Vrai immédiatement pour une boutique non reliée au serveur
  // (aucune synchronisation possible, donc rien à attendre).
  const [cashSyncReady, setCashSyncReady] = useState(false);
  const [categories, setCategories] = useState(null);
  const [movements, setMovements] = useState(null);
  const [inventories, setInventories] = useState(null);
  const [clients, setClients] = useState(null);
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [saleToasts, setSaleToasts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  // Répercute le nombre de notifications non lues sur le badge de l'icône de
  // l'application (écran d'accueil du téléphone), via le plugin natif Badge.
  // N'a aucun effet dans un navigateur classique — uniquement dans l'app compilée.
  useEffect(() => {
    let cancelled = false;
    import("@capawesome/capacitor-badge")
      .then(({ Badge }) => {
        if (cancelled) return;
        if (unreadCount > 0) Badge.set({ count: unreadCount }).catch(() => {});
        else Badge.clear().catch(() => {});
      })
      .catch(() => {}); // paquet non installé (ex. en navigateur web) : on ignore silencieusement
    return () => { cancelled = true; };
  }, [unreadCount]);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  // Sous-section Admin actuellement ouverte (ex : "depenses") — pour que la
  // recherche d'en-tête sache s'adapter même quand l'administrateur est dans
  // Admin > Dépenses, pas seulement le vendeur (qui a Dépenses en onglet
  // direct). Remise à zéro dès qu'on quitte l'écran Admin, pour ne pas garder
  // le contexte d'une sous-section qu'on ne regarde plus.
  const [activeAdminSection, setActiveAdminSection] = useState("stats");
  useEffect(() => { if (view !== "admin") setActiveAdminSection("stats"); }, [view]);
  const [pendingSync, setPendingSync] = useState(0);
  const [license, setLicense] = useState(undefined); // undefined = chargement, null = jamais activée
  const [trialUsed, setTrialUsed] = useState(false);
  const [ownerAccess, setOwnerAccess] = useState(null); // null = non vérifié, string (email) = vérifié
  const [homeScreenActive, setHomeScreenActive] = useState(false);

  useEffect(() => {
    window.storage.set("homeScreenActive", JSON.stringify(homeScreenActive)).catch(() => {});
  }, [homeScreenActive]);

  useEffect(() => {
    (async () => {
      const loadedShops = await loadKey("shops", []);
      let storedActiveId = null;
      try { const r = await window.storage.get("activeShopId"); storedActiveId = JSON.parse(r.value); } catch { storedActiveId = null; }
      const activeId = loadedShops.length > 0 ? (loadedShops.some((s) => s.id === storedActiveId) ? storedActiveId : loadedShops[0].id) : null;

      let loadedLicense = activeId ? await loadLocalLicense(activeId) : null;
      if (loadedLicense === null && activeId) {
        // Migration ponctuelle : avant, une seule clé "license" servait pour
        // tout l'appareil. On la relit une fois pour l'entreprise active et on
        // la recopie sous la clé propre à cette entreprise.
        try {
          const r = await window.storage.get("license");
          const legacy = JSON.parse(r.value);
          if (legacy) { loadedLicense = legacy; window.storage.set(`license:${activeId}`, JSON.stringify(legacy)).catch(() => {}); }
        } catch { /* pas de licence héritée */ }
      }
      let loadedTrialUsed = false;
      try { const r = await window.storage.get("trialUsed"); loadedTrialUsed = JSON.parse(r.value); } catch { loadedTrialUsed = false; }
      let loadedOwnerAccess = null;
      try { const r = await window.storage.get("ownerAccess"); loadedOwnerAccess = JSON.parse(r.value); } catch { loadedOwnerAccess = null; }
      setLicense(loadedLicense);
      setTrialUsed(!!loadedTrialUsed);
      setOwnerAccess(loadedOwnerAccess);
      if (loadedShops.length === 0) { setShops([]); return; }
      const data = await loadShopData(activeId);
      const dedupedShops = uniqueShops(loadedShops);
      if (dedupedShops.length !== loadedShops.length) window.storage.set("shops", JSON.stringify(dedupedShops)).catch(() => {});
      setShops(dedupedShops);
      setActiveShopId(activeId);
      api.setActiveShop(activeId);
      setPendingSync(api.getPendingCount(activeId));
      setProducts(data.products); setSales(data.sales); setVendors(data.vendors); setSuppliers(data.suppliers); setExpenses(data.expenses); setCategories(data.categories); setMovements(data.movements); setInventories(data.inventories); setClients(data.clients); setOrders(data.orders); setSupplierProducts(data.supplierProducts); setAvoirs(data.avoirs); setCashRegisterEntries(data.cashRegisterEntries || []); setVersements(data.versements || []);
      let storedRole = null;
      try { const r = await window.storage.get("sessionRole"); storedRole = JSON.parse(r.value); } catch { storedRole = null; }
      if (storedRole) {
        let storedVendorName = "";
        try { const r = await window.storage.get("sessionVendorName"); storedVendorName = JSON.parse(r.value); } catch { storedVendorName = ""; }
        let storedView = "sell";
        try { const r = await window.storage.get("sessionView"); storedView = JSON.parse(r.value) || "sell"; } catch { storedView = "sell"; }
        setRole(storedRole);
        setCurrentVendorName(storedVendorName);
        setView(storedRole === "admin" ? storedView : (storedView === "admin" ? "sell" : storedView));
      }
      let storedHomeActive = false;
      try { const r = await window.storage.get("homeScreenActive"); storedHomeActive = JSON.parse(r.value); } catch { storedHomeActive = false; }
      if (storedHomeActive) setHomeScreenActive(true);
    })();
  }, []);

  const licenseStatus = computeLicenseStatus(license);

  const handleVerifyOwner = (credentials) => {
    setOwnerAccess(credentials);
    window.storage.set("ownerAccess", JSON.stringify(credentials)).catch(() => {});
  };

  const handleActivateLicense = async (code) => {
    try {
      const data = await api.activateLicense({ code, shopName: shop?.name });
      const next = {
        code,
        planId: data.plan,
        lifetime: !!data.lifetime,
        activatedAt: new Date().toISOString(),
        expiresAt: data.expires_at || null,
      };
      setLicense(next);
      window.storage.set(`license:${activeShopId}`, JSON.stringify(next)).catch(() => {});
      if (shop?.backendLinked) api.syncLicenseToShop(next).catch(() => {});
      const planLabel = ACTIVATION_PLANS.find((p) => p.id === data.plan)?.label || data.plan;
      pushToast(data.lifetime ? "Licence à vie activée !" : `Licence activée — ${planLabel}`, "ok");
    } catch (e) {
      pushToast(e.message || "Code invalide", "error");
    }
  };

  const handleStartTrial = async () => {
    try {
      await api.startTrialBackend();
    } catch (e) {
      pushToast(e.message || "Impossible de démarrer l'essai pour le moment. Réessayez.", "error");
      return;
    }
    const next = { code: null, planId: "trial", lifetime: false, activatedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + TRIAL_DAYS * MS_DAY).toISOString() };
    setLicense(next);
    setTrialUsed(true);
    window.storage.set(`license:${activeShopId}`, JSON.stringify(next)).catch(() => {});
    window.storage.set("trialUsed", JSON.stringify(true)).catch(() => {});
    pushToast(`Essai gratuit démarré — ${TRIAL_DAYS} jours`, "ok");
  };

  const dataReady = license !== undefined && shops !== undefined && (shops.length === 0 || (products !== null && categories !== null && movements !== null && inventories !== null && clients !== null));

  useEffect(() => {
    if (!license || license.lifetime) return;
    (async () => {
      try {
        const data = await api.checkLicense();
        // "none" = appareil totalement inconnu du serveur (ni code payant, ni
        // essai jamais démarré) : rien à corriger, on garde l'état local.
        if (data.status === "none") return;
        // Le serveur fait foi pour la date d'expiration — que ce soit un essai
        // gratuit (suivi via trial_started_at côté base) ou une licence payante
        // (suivi via licenses.expires_at). Ça empêche un essai/une licence
        // périmé(e) de "revivre" en modifiant simplement l'horloge ou le
        // stockage local de l'appareil.
        if (data.expires_at && data.expires_at !== license.expiresAt) {
          setLicense((l) => {
            if (!l) return l;
            const next = { ...l, expiresAt: data.expires_at };
            window.storage.set(`license:${activeShopId}`, JSON.stringify(next)).catch(() => {});
            return next;
          });
        }
      } catch { /* pas de connexion — on garde l'état local tel quel, revérifié au prochain lancement */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [license?.code, license?.planId]);

  // Rappels de licence sur l'appareil (notification système, quotidienne à
  // partir de 5 jours restants, y compris pour l'essai gratuit) — planifiés
  // sur CE device, qu'il soit celui du propriétaire ou d'un vendeur.
  useEffect(() => {
    scheduleLicenseReminders({ license, isOwner: role === "admin" }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [license?.expiresAt, license?.lifetime, role]);
  const shop = shops && activeShopId ? shops.find((s) => s.id === activeShopId) : null;

  // Auto-réparation silencieuse : si une entreprise connectée n'a pas (ou plus) son
  // code d'invitation en local (ex: séquelle d'une ancienne reconnexion), on va le
  // rechercher sur le serveur une fois, sans rien demander à l'utilisateur.
  useEffect(() => {
    if (!shop?.backendLinked || shop.joinCode || !activeShopId) return;
    api.getShopInfo()
      .then((info) => {
        if (!info?.join_code) return;
        const nextShops = shops.map((s) => (s.id === activeShopId ? { ...s, joinCode: info.join_code } : s));
        setShops(nextShops);
        window.storage.set("shops", JSON.stringify(nextShops)).catch(() => {});
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.backendLinked, shop?.joinCode, activeShopId]);

  // Auto-réparation silencieuse : le code administrateur et les codes vendeurs
  // sont vérifiés localement (pas d'appel serveur à chaque connexion), donc si
  // la copie locale d'un appareil dérive de celle du serveur (ex: séquelle
  // d'une ancienne session interrompue, ou modification faite depuis un autre
  // appareil), l'appareil ne se corrigeait jamais tout seul. On relit shopMeta
  // et vendors une fois au chargement de l'entreprise et on met à jour la copie
  // locale si elle diffère — sur TOUS les champs (nom, type, devise, thème...),
  // pas seulement le code administrateur.
  useEffect(() => {
    if (!shop?.backendLinked || !activeShopId) { setCashSyncReady(true); return; }
    setCashSyncReady(false);
    let cancelled = false;
    const syncFromServer = async () => {
      try {
        // Pousse d'abord les changements locaux en attente (ex : le stock
        // décompté par une vente qui vient d'être faite sur CET appareil)
        // avant de tirer la version du serveur — sinon une décrémentation de
        // stock pas encore envoyée pourrait être écrasée par une version
        // plus ancienne venue du serveur.
        await api.flushSyncQueue(getLocalValueRef.current, activeShopId);
        const results = await Promise.allSettled([
          api.pullKey("shopMeta", activeShopId),
          api.pullKey("vendors", activeShopId),
          api.pullKey("shopLicense", activeShopId),
          api.pullKey("products", activeShopId),
          api.pullKey("categories", activeShopId),
          api.pullKey("sales", activeShopId),
          api.pullKey("avoirs", activeShopId),
          api.pullKey("movements", activeShopId),
          api.pullKey("clients", activeShopId),
          api.pullKey("expenses", activeShopId),
          api.pullKey("suppliers", activeShopId),
          api.pullKey("orders", activeShopId),
          api.pullKey("supplierProducts", activeShopId),
          api.pullKey("inventories", activeShopId),
          api.pullKey("cashRegisterEntries", activeShopId),
          api.pullKey("versements", activeShopId),
          api.pullKey("auditLog", activeShopId),
        ]);
        if (cancelled) return;
        // Promise.allSettled (au lieu de Promise.all) : avant, si UNE SEULE
        // de ces 15 clés échouait côté serveur (ex : une clé que le serveur
        // ne reconnaît pas encore), Promise.all rejetait le lot ENTIER et
        // bloquait la mise à jour de TOUTES les autres données — produits,
        // catégories, ventes, etc. — pas seulement celle en échec. Chaque
        // clé a maintenant sa propre chance indépendante de réussir.
        const [freshMeta, freshVendors, freshLicense, freshProducts, freshCategories, freshSales, freshAvoirs, freshMovements, freshClients, freshExpenses, freshSuppliers, freshOrders, freshSupplierProducts, freshInventories, freshCashRegisterEntries, freshVersements, freshAuditLog] =
          results.map((r) => (r.status === "fulfilled" ? r.value : undefined));
        // Annonces vocales des actions faites sur les autres appareils.
        try {
          announceRemoteRef.current?.({
            sales: freshSales, expenses: freshExpenses, avoirs: freshAvoirs, movements: freshMovements, orders: freshOrders, products: freshProducts,
            cashRegisterEntries: Array.isArray(freshCashRegisterEntries) ? ownCashEntries(freshCashRegisterEntries, activeShopId) : freshCashRegisterEntries,
            versements: Array.isArray(freshVersements) ? ownCashEntries(freshVersements, activeShopId) : freshVersements,
          });
        } catch { /* une annonce ratée ne doit jamais bloquer la synchronisation */ }
        if (freshMeta) {
          setShops((prevShops) => {
            const current = (prevShops || []).find((s) => s.id === activeShopId);
            if (!current) return prevShops;
            const merged = { ...current, ...freshMeta };
            const changed = SHOP_META_SYNC_FIELDS.some((k) => JSON.stringify(current[k]) !== JSON.stringify(merged[k]));
            if (!changed) return prevShops;
            const nextShops = prevShops.map((s) => (s.id === activeShopId ? merged : s));
            window.storage.set("shops", JSON.stringify(nextShops)).catch(() => {});
            return nextShops;
          });
        }
        if (Array.isArray(freshVendors)) {
          setVendors((prevVendors) => {
            if (JSON.stringify(prevVendors) === JSON.stringify(freshVendors)) return prevVendors;
            window.storage.set(`vendors:${activeShopId}`, JSON.stringify(freshVendors)).catch(() => {});
            return freshVendors;
          });
        }
        // Idem pour la licence : source de vérité = le serveur QUAND il en a
        // une enregistrée pour cette entreprise. Sans ce contrôle, un appareil
        // qui ouvre une entreprise pour la première fois (ou après longtemps)
        // pouvait afficher une licence obsolète — notamment une entreprise
        // expirée mais jamais revérifiée localement, laissant l'accès ouvert
        // à tort. On ne touche pas à l'état local si le serveur n'a rien
        // (boutique créée avant l'introduction de ce système) : ça éviterait
        // sinon d'effacer par erreur une licence légitime.
        if (freshLicense) {
          setLicense((current) => {
            if (JSON.stringify(current || null) === JSON.stringify(freshLicense)) return current;
            window.storage.set(`license:${activeShopId}`, JSON.stringify(freshLicense)).catch(() => {});
            return freshLicense;
          });
        }
        // Catalogue (produits, catégories) : c'est ce que l'administrateur
        // modifie le plus souvent (prix, stock, nouveaux produits, nouvelles
        // catégories) et que le vendeur doit voir apparaître automatiquement
        // sur son appareil, sans redémarrer l'app. Avant, ceci n'était
        // récupéré qu'une seule fois à l'ouverture de la boutique — cette
        // même fonction tourne maintenant aussi en tâche de fond toutes les
        // 30 secondes (voir plus bas), ce qui rapproche l'app d'une mise à
        // jour automatique. Ce n'est pas un vrai temps réel instantané (pas
        // de notification poussée par le serveur), mais un rafraîchissement
        // périodique silencieux — la vendeuse verra les changements de
        // l'administrateur avec un décalage de quelques dizaines de
        // secondes au maximum, sans rien avoir à faire.
        if (Array.isArray(freshProducts)) {
          setProducts((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(freshProducts)) return prev;
            window.storage.set(`products:${activeShopId}`, JSON.stringify(freshProducts)).catch(() => {});
            return freshProducts;
          });
        }
        if (Array.isArray(freshCategories)) {
          setCategories((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(freshCategories)) return prev;
            window.storage.set(`categories:${activeShopId}`, JSON.stringify(freshCategories)).catch(() => {});
            return freshCategories;
          });
        }
        // Données transactionnelles partagées (ventes, avoirs, mouvements de
        // stock, clients, dépenses, fournisseurs, commandes, inventaires) —
        // c'était le vrai trou : une vente faite par un vendeur sur son
        // appareil n'apparaissait jamais automatiquement chez l'administrateur
        // (ni l'inverse), tant que personne ne rouvrait l'app depuis zéro.
        // Même logique générique pour toutes : ne réécrit l'état local que si
        // le contenu a réellement changé, pour éviter des rendus inutiles.
        const SYNCED_LIST_KEYS = [
          ["sales", freshSales, setSales],
          ["avoirs", freshAvoirs, setAvoirs],
          ["movements", freshMovements, setMovements],
          ["clients", freshClients, setClients],
          ["expenses", freshExpenses, setExpenses],
          ["suppliers", freshSuppliers, setSuppliers],
          ["orders", freshOrders, setOrders],
          ["supplierProducts", freshSupplierProducts, setSupplierProducts],
          ["inventories", freshInventories, setInventories],
          ["cashRegisterEntries", Array.isArray(freshCashRegisterEntries) ? ownCashEntries(freshCashRegisterEntries, activeShopId) : freshCashRegisterEntries, setCashRegisterEntries],
          ["versements", Array.isArray(freshVersements) ? ownCashEntries(freshVersements, activeShopId) : freshVersements, setVersements],
        ];
        if (Array.isArray(freshAuditLog)) {
          const localIds = new Set((auditRef.current || []).map((e) => e.id));
          const serverIds = new Set(freshAuditLog.map((e) => e.id));
          // Le serveur fusionne déjà : on garde sa liste, plus les lignes
          // locales pas encore envoyées.
          const pendingLocal = (auditRef.current || []).filter((e) => !serverIds.has(e.id));
          const hasNew = freshAuditLog.some((e) => !localIds.has(e.id));
          if (hasNew) {
            const merged = [...pendingLocal, ...freshAuditLog].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 5000);
            auditRef.current = merged;
            setAuditLog(merged);
            window.storage.set(`auditLog:${activeShopId}`, JSON.stringify(merged)).catch(() => {});
          }
        }
        SYNCED_LIST_KEYS.forEach(([key, freshValue, setter]) => {
          if (!Array.isArray(freshValue)) return;
          setter((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(freshValue)) return prev;
            window.storage.set(`${key}:${activeShopId}`, JSON.stringify(freshValue)).catch(() => {});
            return freshValue;
          });
        });

        // Signal précis renvoyé par le serveur quand cet appareil n'a plus
        // aucune entreprise correspondante (ex : entreprise supprimée depuis la
        // vue propriétaire). Vérifié maintenant parmi les résultats individuels
        // (allSettled ne rejette plus le lot entier) plutôt que via un throw.
        const deviceUnrecognized = results.some((r) => r.status === "rejected" && r.reason?.message === "Appareil non reconnu");
        if (deviceUnrecognized && !cancelled) {
          const deletedShopId = activeShopId;
          const deletedShopName = shop?.name;
          setRole(null); setCurrentVendorName(""); setCart([]);
          window.storage.delete("sessionRole").catch(() => {});
          window.storage.delete("sessionVendorName").catch(() => {});
          setShops((prevShops) => {
            const nextShops = (prevShops || []).filter((s) => s.id !== deletedShopId);
            window.storage.set("shops", JSON.stringify(nextShops)).catch(() => {});
            Promise.all([
              safeDelete(`products:${deletedShopId}`), safeDelete(`sales:${deletedShopId}`), safeDelete(`vendors:${deletedShopId}`),
              safeDelete(`suppliers:${deletedShopId}`), safeDelete(`expenses:${deletedShopId}`), safeDelete(`categories:${deletedShopId}`), safeDelete(`movements:${deletedShopId}`), safeDelete(`inventories:${deletedShopId}`), safeDelete(`clients:${deletedShopId}`), safeDelete(`orders:${deletedShopId}`), safeDelete(`supplierProducts:${deletedShopId}`),
            ]).catch(() => {});
            api.unlinkShop(deletedShopId);
            if (nextShops.length > 0) {
              loadShopData(nextShops[0].id).then((data) => {
                setProducts(data.products); setSales(data.sales); setVendors(data.vendors); setSuppliers(data.suppliers); setExpenses(data.expenses); setCategories(data.categories); setMovements(data.movements); setInventories(data.inventories); setClients(data.clients); setOrders(data.orders); setSupplierProducts(data.supplierProducts); setAvoirs(data.avoirs); setCashRegisterEntries(data.cashRegisterEntries || []); setVersements(data.versements || []);
              });
              setActiveShopId(nextShops[0].id);
              api.setActiveShop(nextShops[0].id);
              window.storage.set("activeShopId", JSON.stringify(nextShops[0].id)).catch(() => {});
            } else {
              setActiveShopId(null);
              api.setActiveShop(null);
              window.storage.delete("activeShopId").catch(() => {});
            }
            return nextShops;
          });
          pushToast(`"${deletedShopName || "Cette entreprise"}" a été supprimée et n'existe plus sur le serveur.`, "error");
        }
      } catch (e) {
        /* silencieux, best-effort — hors-ligne ou erreur passagère, on retentera au prochain cycle */
      }
    };
    // .finally (jamais de rejet ici : syncFromServer avale déjà ses propres
    // erreurs) sert uniquement à savoir que CE premier passage est terminé,
    // pour ne plus faire attendre l'ouverture de l'app à la fenêtre de fond
    // de caisse au-delà de ce premier essai — succès ou non.
    syncFromServer().finally(() => { if (!cancelled) setCashSyncReady(true); });
    const interval = setInterval(syncFromServer, 12000);
    return () => { cancelled = true; clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.backendLinked, activeShopId]);

  // Synchronise rétroactivement vers le serveur un essai gratuit déjà en cours
  // localement (ex: démarré avant que cette vérification n'existe) — silencieux,
  // sans conséquence si le serveur le connaît déjà.
  useEffect(() => {
    if (license?.planId === "trial") {
      api.startTrialBackend().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [license?.planId]);


  const pushToast = (message, type = "ok") => { setToast({ message, type }); setTimeout(() => setToast(null), 2200); };

  // Journal d'activité propre à chaque entreprise, chargé depuis l'appareil
  // puis complété par le serveur lors de la synchronisation.
  useEffect(() => {
    if (!activeShopId) return undefined;
    let off = false;
    loadKey(`auditLog:${activeShopId}`, []).then((v) => {
      if (off) return;
      const list = Array.isArray(v) ? v : [];
      auditRef.current = list;
      setAuditLog(list);
    });
    return () => { off = true; };
  }, [activeShopId]);

  useEffect(() => {
    const mark = () => {
      const now = Date.now();
      if (now - lastActivityRef.current < 3000) { lastActivityRef.current = now; return; }
      lastActivityRef.current = now;
      try { localStorage.setItem("lastActivityAt", String(now)); } catch { /* ignore */ }
    };
    const evs = ["pointerdown", "keydown", "touchstart", "wheel"];
    evs.forEach((ev) => window.addEventListener(ev, mark, { passive: true }));
    return () => evs.forEach((ev) => window.removeEventListener(ev, mark));
  }, []);
  const lockMinutes = Number(shop?.autoLockMinutes) || 0;
  useEffect(() => {
    if (!role || !lockMinutes) return undefined;
    const limit = lockMinutes * 60000;
    const stored = Number((() => { try { return localStorage.getItem("lastActivityAt"); } catch { return 0; } })()) || Date.now();
    if (Date.now() - stored > limit) lockNow();
    const check = () => { if (Date.now() - lastActivityRef.current > limit) lockNow(); };
    const timer = setInterval(check, 10000);
    const onVis = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVis); };
  }, [role, lockMinutes]);

  const getLocalValue = (key) => {
    switch (key) {
      case "shopMeta": return shop ? pickShopMeta(shop) : {};
      case "auditLog": return auditRef.current || [];
      case "vendors": return vendors;
      case "products": return products;
      case "sales": return sales;
      case "categories": return categories;
      case "suppliers": return suppliers;
      case "expenses": return expenses;
      case "movements": return movements;
      case "inventories": return inventories;
      case "clients": return clients;
      case "orders": return orders;
      case "supplierProducts": return supplierProducts;
      case "avoirs": return avoirs;
      case "versements": return versements;
      case "cashRegisterEntries": return cashRegisterEntries;
      // Manquait ici : sans ce cas, toute resynchronisation automatique de
      // "shopLicense" (au lancement de l'app, à la reconnexion réseau)
      // renvoyait `null` par défaut et effaçait la licence d'essai/payante
      // enregistrée côté serveur — exactement le bug des entreprises créées
      // aujourd'hui affichées "INACTIF" alors que leur essai est en cours.
      case "shopLicense": return license ?? null;
      default: return null;
    }
  };
  // getLocalValue ci-dessus est recréée à CHAQUE rendu (elle lit products,
  // sales, etc. directement par fermeture) — correct pour un appel immédiat
  // (ex: juste après une vente), mais un piège pour tout ce qui s'exécute en
  // arrière-plan sur une minuterie (setInterval) : l'effet qui démarre cette
  // minuterie ne se relance que si `shop?.backendLinked`/`activeShopId`
  // changent (rarement en cours de session), donc la fonction capturée à ce
  // moment-là restait figée pour toute la session — chaque tentative de
  // resynchronisation périodique renvoyait alors les DONNÉES D'IL Y A
  // PLUSIEURS HEURES (ventes, stock, etc. au moment de l'ouverture de la
  // boutique), jamais les plus récentes. C'est très probablement une cause
  // directe du souci "les modifications ne se répercutent pas" : la
  // synchronisation automatique tournait, mais avec de vieilles données.
  // Cette référence est mise à jour à chaque rendu et donne toujours la
  // valeur la plus fraîche, y compris depuis une fermeture créée il y a
  // longtemps (dans une minuterie notamment).
  const getLocalValueRef = useRef(getLocalValue);
  getLocalValueRef.current = getLocalValue;

  // ---------- Notifications vocales (tous les rôles, réglage par appareil) ----------
  const [voicePrefs, setVoicePrefs] = useState(() => readVoicePrefs(null));
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);
  useEffect(() => {
    const p = readVoicePrefs(shop);
    setVoicePrefs(p);
    voiceVolume = p.volume;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id, shop?.voiceNotificationsEnabled]);
  const saveVoicePrefs = (next) => {
    setVoicePrefs(next);
    voiceVolume = next.volume;
    writeVoicePrefs(shop, next);
  };
  const announce = (type, text) => { if (text) speak(text, voiceOn(shop, type)); };
  const selfName = role === "admin" ? (shop?.adminDisplayName?.trim() || "Administrateur") : currentVendorName;
  // Annonce les actions faites sur les AUTRES appareils, détectées à chaque
  // synchronisation : on compare la nouvelle version du serveur à la
  // précédente. La première passe sert juste de référence (rien n'est dit).
  // On compare la version du serveur à l'état LOCAL juste avant de
  // l'appliquer : ce qui diffère vient forcément d'un autre appareil (les
  // changements locaux sont envoyés avant chaque récupération).
  const remoteSeededRef = useRef(null);
  const announceRemoteChanges = (fresh) => {
    const firstPass = remoteSeededRef.current !== activeShopId;
    remoteSeededRef.current = activeShopId;
    if (firstPass) return;
    const money = (n) => spokenAmount(formatMoney(Number(n) || 0, shop?.currency));
    const isOther = (name) => !!name && name !== selfName && !(role === "admin" && name === "Administrateur");
    const lines = [];
    const byId = (list) => new Map((list || []).map((x) => [x.id, x]));
    const diff = (key, list, fn) => {
      if (!Array.isArray(list)) return;
      const local = getLocalValueRef.current(key);
      if (!Array.isArray(local) || local.length === 0) return;
      if (JSON.stringify(local) === JSON.stringify(list)) return;
      fn(byId(local), byId(list));
    };
    diff("sales", fresh.sales, (prev, next) => {
      next.forEach((s, id) => {
        const before = prev.get(id);
        if (!before) { if (isOther(s.vendor)) lines.push(["sale", `Nouvelle vente de ${money(s.total)} par ${s.vendor}.`]); return; }
        const rb = saleReturnsOf(before), ra = saleReturnsOf(s);
        if (ra.length > rb.length) {
          const r = ra[ra.length - 1];
          if (isOther(r?.by)) lines.push(["cancel", `Retour client sur la vente ${receiptNumber(id)}, ${money(r.amount)}${Number(r.refund) > 0 ? `, ${money(r.refund)} remboursés` : ""}.`]);
        } else if (before.total !== s.total || before.paymentMethod !== s.paymentMethod) lines.push(["cancel", `Vente numéro ${receiptNumber(id)} modifiée, nouveau total ${money(s.total)}.`]);
        const pb = creditPaymentsOf(before), pa = creditPaymentsOf(s);
        if (pa.length > pb.length) {
          const last = pa[pa.length - 1];
          if (isOther(last?.by)) lines.push(["credit", `Crédit encaissé${s.clientName ? ` pour ${s.clientName}` : ""} : ${money(last.amount)}.`]);
        }
      });
      prev.forEach((s, id) => { if (!next.has(id)) lines.push(["cancel", `Vente de ${money(s.total)} supprimée.`]); });
    });
    diff("expenses", fresh.expenses, (prev, next) => {
      next.forEach((e, id) => { if (!prev.has(id) && (isOther(e.author) || !e.author)) lines.push(["expense", `Nouvelle dépense : ${e.label || "sans libellé"}, ${money(e.amount)}.`]); });
    });
    diff("avoirs", fresh.avoirs, (prev, next) => {
      next.forEach((a, id) => {
        const before = prev.get(id);
        if (!before) { if (isOther(a.vendor)) lines.push(["credit", `Avoir ${a.type === "produit" ? "produit" : "monnaie"} créé pour ${a.clientName || "un client"}.`]); return; }
        if ((a.redemptions || []).length > (before.redemptions || []).length) lines.push(["credit", `Avoir rendu à ${a.clientName || "un client"}.`]);
      });
    });
    diff("movements", fresh.movements, (prev, next) => {
      const added = [...next.values()].filter((m) => !prev.has(m.id) && m.type !== "vente" && m.type !== "retour" && isOther(m.author));
      if (added.length === 1) { const m = added[0]; lines.push(["movement", `Stock modifié : ${m.productName}, ${m.delta > 0 ? "plus" : "moins"} ${Math.abs(m.delta)}.`]); }
      else if (added.length > 1) lines.push(["movement", `${added.length} mouvements de stock enregistrés.`]);
    });
    diff("orders", fresh.orders, (prev, next) => {
      next.forEach((o, id) => {
        const before = prev.get(id);
        if (!before) lines.push(["order", "Nouvelle commande fournisseur créée."]);
        else if (before.status !== "received" && o.status === "received") lines.push(["order", `Commande fournisseur reçue${o.total ? `, ${money(o.total)}` : ""}.`]);
        else if (JSON.stringify(before.items) !== JSON.stringify(o.items)) lines.push(["order", "Commande fournisseur modifiée."]);
      });
      prev.forEach((o, id) => { if (!next.has(id)) lines.push(["order", "Commande fournisseur supprimée."]); });
    });
    diff("cashRegisterEntries", fresh.cashRegisterEntries, (prev, next) => {
      next.forEach((c, id) => {
        const before = prev.get(id);
        if (!before) { if (isOther(c.setBy)) lines.push(["cash", `Fond de caisse de ${money(c.amount)} saisi par ${c.setBy}.`]); }
        else if (Number(before.amount) !== Number(c.amount)) lines.push(["cash", `Montant de caisse modifié : ${money(c.amount)}.`]);
      });
    });
    diff("versements", fresh.versements, (prev, next) => {
      next.forEach((v, id) => { if (!prev.has(id) && isOther(v.recordedBy)) lines.push(["cash", `Versement de ${money(v.amount)} enregistré par ${v.recordedBy}.`]); });
    });
    diff("products", fresh.products, (prev, next) => {
      next.forEach((p, id) => {
        const before = prev.get(id);
        if (!before || Number(p.stock) >= Number(before.stock)) return;
        const min = Number(p.minStock) || 0;
        if (p.stock <= 0 && before.stock > 0) lines.push(["stock", `Rupture de stock : ${p.name}.`]);
        else if (p.stock <= min && before.stock > min) lines.push(["stock", `Stock bas : ${p.name}, il en reste ${p.stock}.`]);
      });
    });
    const wanted = lines.filter(([type]) => voiceOn(shop, type));
    if (wanted.length === 0) return;
    const text = wanted.length > 4 ? `${wanted.length} nouvelles actions. ${wanted.slice(0, 3).map((l) => l[1]).join(" ")}` : wanted.map((l) => l[1]).join(" ");
    speak(text, true);
  };
  const announceRemoteRef = useRef(announceRemoteChanges);
  announceRemoteRef.current = announceRemoteChanges;

  const trySync = (verbose) => {
    if (shop?.backendLinked) {
      api.flushSyncQueue(getLocalValueRef.current).then((result) => {
        setPendingSync(api.getPendingCount());
        if (verbose) {
          if (result.lastError) pushToast(`Erreur de synchro : ${result.lastError}`, "error");
          else if (result.remaining === 0) pushToast("Synchronisation à jour ✓", "ok");
          else pushToast(`${result.synced} synchronisé(s), ${result.remaining} en attente`, "ok");
        }
      }).catch((e) => { if (verbose) pushToast(`Erreur : ${e.message}`, "error"); });
    }
  };

  useEffect(() => {
    if (!shop?.backendLinked) return;
    setPendingSync(api.getPendingCount());
    trySync();
    const onOnline = () => trySync();
    window.addEventListener("online", onOnline);
    const interval = setInterval(trySync, 12000);
    return () => { window.removeEventListener("online", onOnline); clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.backendLinked, activeShopId]);

  // Auto-réparation silencieuse, une fois par ouverture de boutique côté
  // administrateur : un ancien bug envoyait au serveur une version incomplète
  // de shopMeta (il manquait notamment voiceNotificationsEnabled), ce qui
  // laissait les vendeurs bloqués avec une configuration périmée même après
  // correction du code, tant que personne ne renvoyait une version complète.
  // On repousse donc une fois, silencieusement, la version locale complète
  // (déjà correcte grâce à getLocalValue) pour écraser toute donnée
  // incomplète restée sur le serveur depuis avant ce correctif — sans rien
  // demander à l'administrateur.
  useEffect(() => {
    if (!shop?.backendLinked || !activeShopId || role !== "admin") return;
    api.syncKeyNow("shopMeta", getLocalValueRef.current("shopMeta"), activeShopId).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.backendLinked, activeShopId, role]);

  // Alertes de stock par palier — déclenchées exactement quand le stock d'un
  // produit CROISE (en baissant) l'un des seuils 5, 4, 2, 1 ou 0, quelle que
  // soit l'action qui a fait baisser le stock (vente, mouvement manuel,
  // comptage d'inventaire...). Comparé à l'ancien état pour ne notifier
  // qu'une fois par franchissement, pas à chaque sauvegarde.
  const STOCK_ALERT_LEVELS = [5, 4, 2, 1, 0];
  const checkStockAlerts = (prevProducts, nextProducts) => {
    nextProducts.forEach((p) => {
      const before = prevProducts.find((x) => x.id === p.id);
      if (!before || before.stock === p.stock) return;
      if (p.stock >= before.stock) return; // seulement en cas de baisse
      const crossed = STOCK_ALERT_LEVELS.find((level) => p.stock <= level && before.stock > level);
      if (crossed === undefined) return;
      pushNotification({ type: "stock_alert", productName: p.name, stock: p.stock, unit: p.unit, level: crossed });
    });
  };
  const saveProducts = async (next) => {
    checkStockAlerts(products, next);
    try {
      const before = new Map((products || []).map((p) => [p.id, p]));
      const after = new Set((next || []).map((p) => p.id));
      const money = (n) => formatMoney(Number(n) || 0, shop?.currency);
      (next || []).forEach((p) => {
        const old = before.get(p.id);
        if (!old) { logAudit("stock", `Produit créé : ${p.name} (${money(p.price)})`, { productId: p.id }); return; }
        if (Number(old.price) !== Number(p.price)) logAudit("prix", `Prix de ${p.name} modifié : ${money(old.price)} → ${money(p.price)}`, { productId: p.id });
        if (Number(old.bulkPrice || 0) !== Number(p.bulkPrice || 0)) logAudit("prix", `Prix par lot de ${p.name} modifié : ${money(old.bulkPrice)} → ${money(p.bulkPrice)}`, { productId: p.id });
        if (Number(old.costPrice || 0) !== Number(p.costPrice || 0)) logAudit("prix", `Prix d'achat de ${p.name} modifié : ${money(old.costPrice)} → ${money(p.costPrice)}`, { productId: p.id });
        if (old.name !== p.name) logAudit("stock", `Produit renommé : ${old.name} → ${p.name}`, { productId: p.id });
      });
      (products || []).forEach((p) => { if (!after.has(p.id)) logAudit("stock", `Produit supprimé : ${p.name} (${p.stock} en stock)`, { productId: p.id }); });
    } catch { /* ignore */ }
    // Filet de sécurité global : avant, une seule photo trop lourde QUELQUE
    // PART dans le catalogue faisait échouer TOUTE sauvegarde de produit —
    // même celle d'un article sans photo — puisque tous les produits d'une
    // boutique partagent une seule clé de stockage, sauvegardée d'un bloc.
    // On recompresse ici n'importe quelle photo oubliée trop volumineuse,
    // pas seulement celle du produit qu'on est en train de modifier.
    let safeNext = next;
    if (next.some((p) => p.image && p.image.length > 250000)) {
      safeNext = await Promise.all(next.map(async (p) => {
        if (!p.image || p.image.length <= 250000) return p;
        try { return { ...p, image: await recompressDataUrl(p.image) }; } catch { return { ...p, image: null }; }
      }));
    }
    setProducts(safeNext);
    window.storage.set(`products:${activeShopId}`, JSON.stringify(safeNext)).catch(() => pushToast("Erreur de sauvegarde", "error"));
    if (shop?.backendLinked) { api.markDirty("products"); setPendingSync(api.getPendingCount()); api.syncKeyNow("products", safeNext).then(() => setPendingSync(api.getPendingCount())); }
  };
  const saveSales = (next) => { setSales(next); window.storage.set(`sales:${activeShopId}`, JSON.stringify(next)).catch(() => pushToast("Erreur de sauvegarde", "error")); if (shop?.backendLinked) { api.markDirty("sales"); setPendingSync(api.getPendingCount()); api.syncKeyNow("sales", next).then(() => setPendingSync(api.getPendingCount())); } };
  const saveVendors = (next) => {
    try {
      const before = new Map((vendors || []).map((v) => [v.id || v.name, v]));
      const ids = new Set((next || []).map((v) => v.id || v.name));
      (next || []).forEach((v) => {
        const old = before.get(v.id || v.name);
        if (!old) { logAudit("securite", `Vendeur ajouté : ${v.name}`); return; }
        if (!!old.blocked !== !!v.blocked) logAudit("securite", `${v.blocked ? "Vendeur bloqué" : "Vendeur débloqué"} : ${v.name}`);
        if ((old.pinHash || old.pin) !== (v.pinHash || v.pin)) logAudit("securite", `Code de ${v.name} modifié`);
      });
      (vendors || []).forEach((v) => { if (!ids.has(v.id || v.name)) logAudit("securite", `Vendeur supprimé : ${v.name}`); });
    } catch { /* le journal ne bloque jamais */ }
    setVendors(next); window.storage.set(`vendors:${activeShopId}`, JSON.stringify(next)).catch(() => pushToast("Erreur de sauvegarde", "error")); if (shop?.backendLinked) { api.markDirty("vendors"); setPendingSync(api.getPendingCount()); api.syncKeyNow("vendors", next).then(() => setPendingSync(api.getPendingCount())); }
  };
  const saveSuppliers = (next) => { setSuppliers(next); window.storage.set(`suppliers:${activeShopId}`, JSON.stringify(next)).catch(() => pushToast("Erreur de sauvegarde", "error")); if (shop?.backendLinked) { api.markDirty("suppliers"); setPendingSync(api.getPendingCount()); api.syncKeyNow("suppliers", next).then(() => setPendingSync(api.getPendingCount())); } };
  const saveExpenses = (next) => {
    try {
      const known = new Map((expenses || []).map((e) => [e.id, e]));
      const ids = new Set((next || []).map((e) => e.id));
      (next || []).forEach((e) => { if (!known.has(e.id)) logAudit("caisse", `Dépense : ${e.label || "sans libellé"} (${formatMoney(Number(e.amount) || 0, shop?.currency)})`, { amount: -(Number(e.amount) || 0) }); });
      (expenses || []).forEach((e) => { if (!ids.has(e.id)) logAudit("caisse", `Dépense supprimée : ${e.label || "sans libellé"} (${formatMoney(Number(e.amount) || 0, shop?.currency)})`); });
    } catch { /* le journal ne bloque jamais */ }
    setExpenses(next); window.storage.set(`expenses:${activeShopId}`, JSON.stringify(next)).catch(() => pushToast("Erreur de sauvegarde", "error")); if (shop?.backendLinked) { api.markDirty("expenses"); setPendingSync(api.getPendingCount()); api.syncKeyNow("expenses", next).then(() => setPendingSync(api.getPendingCount())); }
  };
  const saveOrders = (next) => { setOrders(next); window.storage.set(`orders:${activeShopId}`, JSON.stringify(next)).catch(() => pushToast("Erreur de sauvegarde", "error")); if (shop?.backendLinked) { api.markDirty("orders"); setPendingSync(api.getPendingCount()); api.syncKeyNow("orders", next).then(() => setPendingSync(api.getPendingCount())); } };
  const saveSupplierProducts = (next) => { setSupplierProducts(next); window.storage.set(`supplierProducts:${activeShopId}`, JSON.stringify(next)).catch(() => pushToast("Erreur de sauvegarde", "error")); if (shop?.backendLinked) { api.markDirty("supplierProducts"); setPendingSync(api.getPendingCount()); api.syncKeyNow("supplierProducts", next).then(() => setPendingSync(api.getPendingCount())); } };
  // Avoirs : sommes ou produits que LA BOUTIQUE doit à un client (monnaie non
  // rendue, ou produits vendus mais pas encore remis). Enregistrés comme les
  // autres données, avec synchronisation immédiate vers le serveur.
  const saveAvoirs = (next) => {
    setAvoirs(next);
    try {
      window.storage.set(`avoirs:${activeShopId}`, JSON.stringify(next)).catch(() => pushToast("Erreur de sauvegarde", "error"));
      if (shop?.backendLinked) {
        api.markDirty("avoirs");
        setPendingSync(api.getPendingCount());
        api.syncKeyNow("avoirs", next).then(() => setPendingSync(api.getPendingCount())).catch(() => pushToast("Synchronisation différée — vos données restent enregistrées sur l'appareil", "error"));
      }
    } catch {
      // Toute erreur de stockage local ou de synchronisation ne doit jamais
      // faire planter l'écran — l'état React (`avoirs`) est déjà à jour, la
      // synchronisation sera retentée automatiquement plus tard.
      pushToast("Enregistré localement — synchronisation en attente", "error");
    }
  };
  const saveCategories = (next) => { setCategories(next); window.storage.set(`categories:${activeShopId}`, JSON.stringify(next)).catch(() => pushToast("Erreur de sauvegarde", "error")); if (shop?.backendLinked) { api.markDirty("categories"); setPendingSync(api.getPendingCount()); api.syncKeyNow("categories", next).then(() => setPendingSync(api.getPendingCount())); } pushToast("Catégories mises à jour", "ok"); };
  const saveCashRegisterEntries = (next) => { setCashRegisterEntries(next); window.storage.set(`cashRegisterEntries:${activeShopId}`, JSON.stringify(next)).catch(() => pushToast("Erreur de sauvegarde", "error")); if (shop?.backendLinked) { api.markDirty("cashRegisterEntries"); setPendingSync(api.getPendingCount()); api.syncKeyNow("cashRegisterEntries", next).then(() => setPendingSync(api.getPendingCount())); } };
  // Date de la "journée commerciale" au format AAAA-MM-JJ — sert de clé
  // unique : un seul montant de caisse par jour, peu importe qui le
  // renseigne (vendeur ou administrateur), partagé par toute la boutique.
  // L'heure de bascule (cashRegisterResetHour) est réglable dans Admin >
  // Établissement pour les commerces ouverts tard.
  //
  // Filtre défensif par shopId en plus de la date : même si
  // cashRegisterEntries est censé être rechargé proprement à chaque
  // changement de boutique (loadShopData le fait déjà), cette double
  // vérification garantit qu'une entrée ne peut jamais s'afficher ou se
  // compter sur la mauvaise boutique, quelle qu'en soit la cause.
  // Session de caisse ouverte (fond saisi, pas encore versé). Nommée
  // todayCashEntry pour le reste du code : "la caisse est-elle ouverte ?".
  const activeCashSession = findActiveCashSession(cashRegisterEntries, versements, activeShopId);
  const todayCashEntry = activeCashSession;
  const saveVersements = (next) => { setVersements(next); window.storage.set(`versements:${activeShopId}`, JSON.stringify(next)).catch(() => pushToast("Erreur de sauvegarde", "error")); if (shop?.backendLinked) { api.markDirty("versements"); setPendingSync(api.getPendingCount()); api.syncKeyNow("versements", next).then(() => setPendingSync(api.getPendingCount())); } };
  const recordCashRegister = (amount) => {
    const author = role === "admin" ? (shop?.adminDisplayName?.trim() || "Administrateur") : currentVendorName;
    const entry = { id: uid(), shopId: activeShopId, date: todayCashDateKey(shop?.cashRegisterResetHour), amount: Math.max(0, Number(amount) || 0), setBy: author, timestamp: new Date().toISOString() };
    // Plusieurs sessions possibles le même jour (une par versement) : on
    // ajoute la nouvelle sans effacer les précédentes.
    const next = [...ownCashEntries(cashRegisterEntries, activeShopId), entry];
    saveCashRegisterEntries(next);
    setCashRegisterModalOpen(false);
    setCashModalAfterVersement(false);
    pushToast("Fond de caisse enregistré", "ok");
    logAudit("caisse", `Caisse ouverte · fond ${formatMoney(entry.amount, shop?.currency)}`, { amount: entry.amount });
    announce("cash", `Fond de caisse enregistré : ${spokenAmount(formatMoney(entry.amount, shop?.currency))}.`);
  };
  // Versement : clôture la session ouverte avec son bilan complet, puis
  // rouvre immédiatement la fenêtre pour saisir ce qui reste dans la caisse.
  const recordVersement = ({ amount, by, receivedBy, note }) => {
    if (!activeCashSession) { pushToast("Aucune caisse ouverte à verser", "error"); return false; }
    const now = new Date().toISOString();
    const recap = computeCashSession(activeCashSession, { sales, expenses, until: now });
    const versed = Math.max(0, Number(amount) || 0);
    const v = {
      id: uid(), shopId: activeShopId, sessionId: activeCashSession.id,
      date: now, openedAt: activeCashSession.timestamp || activeCashSession.date, openedBy: activeCashSession.setBy || "",
      ...recap, amount: versed, gap: versed - recap.expected,
      by: (by || "").trim(), receivedBy: (receivedBy || "").trim(), note: (note || "").trim(),
      recordedBy: role === "admin" ? (shop?.adminDisplayName?.trim() || "Administrateur") : currentVendorName,
    };
    saveVersements([...ownCashEntries(versements, activeShopId), v]);
    pushToast("Versement enregistré — saisissez le montant restant en caisse", "ok");
    announce("cash", `Versement de ${spokenAmount(formatMoney(versed, shop?.currency))} enregistré.`);
    logAudit("caisse", `Versement ${formatMoney(versed, shop?.currency)} · attendu ${formatMoney(recap.expected, shop?.currency)} · écart ${versed - recap.expected > 0 ? "+" : ""}${formatMoney(versed - recap.expected, shop?.currency)}`, { amount: versed });
    setCashModalAfterVersement(true);
    setCashRegisterModalOpen(true);
    return v;
  };
  const saveMovements = (next) => {
    try {
      const known = new Set((movements || []).map((m) => m.id));
      const added = (next || []).filter((m) => !known.has(m.id) && m.type !== "vente" && m.type !== "retour" && m.type !== "creation" && !SALE_ADJUST_NOTES.includes(m.note));
      if (added.length > 0 && added.length <= 3) {
        added.forEach((m) => {
          const label = m.type === "livraison" ? "Arrivage" : m.type === "comptage" ? "Comptage" : m.type === "perte" ? "Perte" : "Stock ajusté";
          logAudit("stock", `${label} · ${m.productName} : ${m.before} → ${m.after}${m.note ? ` (${m.note})` : ""}`, { productId: m.productId });
        });
      } else if (added.length > 3) {
        const kind = added.every((m) => m.type === "livraison") ? "Arrivage fournisseur" : added.every((m) => m.type === "comptage") ? "Comptage d'inventaire" : "Mouvements de stock";
        logAudit("stock", `${kind} : ${added.length} produits mis à jour`);
      }
    } catch { /* le journal ne bloque jamais */ }
    setMovements(next); window.storage.set(`movements:${activeShopId}`, JSON.stringify(next)).catch(() => pushToast("Erreur de sauvegarde", "error")); if (shop?.backendLinked) { api.markDirty("movements"); setPendingSync(api.getPendingCount()); api.syncKeyNow("movements", next).then(() => setPendingSync(api.getPendingCount())); }
  };
  // Ouvre automatiquement la fenêtre fond de caisse dès l'entrée sur "Vendre"
  // (ou au chargement si on est déjà dessus) tant qu'aucun montant n'a été
  // renseigné pour aujourd'hui — pas seulement au moment de valider une vente.
  const [cashModalAfterVersement, setCashModalAfterVersement] = useState(false);
  useEffect(() => {
    if (view === "sell" && role && shop && cashSyncReady && !todayCashEntry) {
      setCashRegisterModalOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, role, shop?.id, cashSyncReady, !!todayCashEntry]);
  // Filet de sécurité : si la fenêtre est déjà ouverte (l'utilisateur est en
  // train de regarder le champ de saisie) et qu'un montant arrive entre-temps
  // — synchronisation périodique qui rapporte l'entrée saisie ailleurs par un
  // autre vendeur ou par l'administrateur — on referme automatiquement la
  // fenêtre sans rien demander de plus à cette personne.
  useEffect(() => {
    if (cashRegisterModalOpen && todayCashEntry) {
      setCashRegisterModalOpen(false);
      pushToast("Fond de caisse déjà renseigné", "ok");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!todayCashEntry]);
  const saveClients = (next) => { setClients(next); window.storage.set(`clients:${activeShopId}`, JSON.stringify(next)).catch(() => pushToast("Erreur de sauvegarde", "error")); if (shop?.backendLinked) { api.markDirty("clients"); setPendingSync(api.getPendingCount()); api.syncKeyNow("clients", next).then(() => setPendingSync(api.getPendingCount())); } };
  const onCreateClient = (name) => {
    const newClient = { id: uid(), name, phone: "", notes: "", loyaltyRedeemed: 0 };
    saveClients([...clients, newClient]);
    return newClient.id;
  };
  const saveInventories = (next) => { setInventories(next); window.storage.set(`inventories:${activeShopId}`, JSON.stringify(next)).catch(() => pushToast("Erreur de sauvegarde", "error")); if (shop?.backendLinked) { api.markDirty("inventories"); setPendingSync(api.getPendingCount()); api.syncKeyNow("inventories", next).then(() => setPendingSync(api.getPendingCount())); } };

  const saveShopMeta = (next) => {
    const trimmedName = (next.name || "").trim();
    // Deux entreprises du même compte ne doivent pas porter le même nom (comparaison
    // insensible à la casse et aux espaces) — sinon impossible de les distinguer
    // dans les sélecteurs d'entreprise.
    const duplicate = shops.some((s) => s.id !== activeShopId && (s.name || "").trim().toLowerCase() === trimmedName.toLowerCase());
    if (duplicate) { pushToast("Ce nom d'entreprise est déjà utilisé par une autre entreprise. Choisis-en un autre.", "error"); return; }
    try {
      if (shop && (next.adminPinHash !== shop.adminPinHash || next.adminPin !== shop.adminPin)) logAudit("securite", "Code administrateur modifié");
      if (shop && (Number(next.autoLockMinutes) || 0) !== (Number(shop.autoLockMinutes) || 0)) logAudit("securite", `Verrouillage automatique : ${Number(next.autoLockMinutes) ? `après ${next.autoLockMinutes} min` : "désactivé"}`);
      if (shop && (next.protectSensitive !== false) !== (shop.protectSensitive !== false)) logAudit("securite", `Code administrateur pour les actions sensibles : ${next.protectSensitive === false ? "désactivé" : "activé"}`);
      if (shop && next.currency !== shop.currency) logAudit("securite", `Devise modifiée : ${shop.currency} → ${next.currency}`);
      if (shop && (Number(next.vatRate) || 0) !== (Number(shop.vatRate) || 0)) logAudit("prix", `Taux de TVA des factures : ${Number(next.vatRate) || 0} %`);
    } catch { /* ignore */ }
    const nextShops = shops.map((s) => (s.id === activeShopId ? { ...next, name: trimmedName } : s));
    setShops(nextShops);
    window.storage.set("shops", JSON.stringify(nextShops)).catch(() => pushToast("Erreur de sauvegarde", "error"));
    if (next.backendLinked) {
      api.markDirty("shopMeta");
      setPendingSync(api.getPendingCount());
      // Doit rester aligné avec SHOP_META_FIELDS (utilisé côté lecture pour
      // savoir quels champs re-synchroniser depuis le serveur) : tout champ
      // oublié ici est modifiable localement par l'administrateur mais ne
      // remonte jamais vers le serveur, donc jamais vu par les vendeurs —
      // c'était le cas de adminDisplayName, voiceNotificationsEnabled et
      // cashRegisterResetHour, ajoutés pour corriger ce trou.
      const metaPayload = { ...pickShopMeta(next), name: trimmedName };
      api.syncKeyNow("shopMeta", metaPayload).then(() => setPendingSync(api.getPendingCount()));
    }
    pushToast("Entreprise mise à jour", "ok");
  };

  // ---------- Journal d'activité ----------
  const actorName = () => (role === "admin" ? (shop?.adminDisplayName?.trim() || "Administrateur") : (currentVendorName || ""));
  const logAudit = (type, text, extra = {}) => {
    try {
      if (!activeShopId) return;
      const entry = { id: uid(), date: new Date().toISOString(), type, text, by: actorName(), role: role || "", ...extra };
      const next = [entry, ...(auditRef.current || [])].slice(0, 5000);
      auditRef.current = next;
      setAuditLog(next);
      window.storage.set(`auditLog:${activeShopId}`, JSON.stringify(next)).catch(() => {});
      if (shop?.backendLinked) {
        api.markDirty("auditLog");
        setPendingSync(api.getPendingCount());
        api.syncKeyNow("auditLog", next).then(() => setPendingSync(api.getPendingCount()));
      }
    } catch { /* le journal ne doit jamais bloquer une action */ }
  };

  // ---------- Verrouillage automatique et code administrateur ----------
  const markActivity = () => {
    lastActivityRef.current = Date.now();
    try { localStorage.setItem("lastActivityAt", String(Date.now())); } catch { /* ignore */ }
  };
  const lockNow = () => {
    setLocked(true);
    try { localStorage.setItem("sessionLocked", "1"); } catch { /* ignore */ }
  };
  const clearLock = () => {
    setLocked(false);
    unlockFailsRef.current = 0;
    try { localStorage.removeItem("sessionLocked"); } catch { /* ignore */ }
    markActivity();
  };
  const verifyAdminPin = (pin) => (shop?.backendLinked ? api.verifyPin(pin, shop.adminPinHash) : pin === (shop?.adminPin || DEFAULT_ADMIN_PIN));
  const verifyCurrentUserPin = (pin) => {
    if (role === "admin") return verifyAdminPin(pin);
    const v = (vendors || []).find((x) => x.name === currentVendorName);
    if (!v) return verifyAdminPin(pin);
    return shop?.backendLinked ? api.verifyPin(pin, v.pinHash) : v.pin === pin;
  };
  const handleUnlock = (pin) => {
    if (verifyCurrentUserPin(pin)) { clearLock(); return true; }
    unlockFailsRef.current += 1;
    if (unlockFailsRef.current === 3) logAudit("securite", `3 codes erronés pour déverrouiller la session de ${actorName() || "l'utilisateur"}`);
    pushToast("Code incorrect", "error");
    return false;
  };
  // Actions sensibles : exige le code administrateur (réglable dans Sécurité).
  const requireAdmin = (label, action) => {
    if (shop?.protectSensitive === false) { action(); return; }
    setAdminGuard({ label, action });
  };
  const handleAdminGuard = (pin) => {
    if (!adminGuard) return true;
    if (!verifyAdminPin(pin)) { pushToast("Code administrateur incorrect", "error"); logAudit("securite", `Code administrateur erroné · ${adminGuard.label}`); return false; }
    const { action, label } = adminGuard;
    setAdminGuard(null);
    logAudit("securite", `Action autorisée par code administrateur : ${label}`);
    try { action(); } catch { /* ignore */ }
    return true;
  };

  const handleOnboardingComplete = async (shopMeta, vendor, serverShopLicense) => {
    const newShop = { salesNotificationsEnabled: true, theme: "emeraude", darkMode: false, soundsEnabled: true, ...shopMeta };
    const nextShops = [newShop];
    setShops(nextShops);
    window.storage.set("shops", JSON.stringify(nextShops)).catch(() => {});
    window.storage.set("activeShopId", JSON.stringify(newShop.id)).catch(() => {});
    await seedShopData(newShop.id, vendor);
    setActiveShopId(newShop.id);
    api.setActiveShop(newShop.id);
    setProducts(SEED_PRODUCTS); setSales([]); setVendors([vendor]); setSuppliers(SEED_SUPPLIERS); setExpenses([]); setCategories(SEED_CATEGORIES); setMovements([]); setInventories([]); setClients([]); setOrders([]); setSupplierProducts([]); setAvoirs([]); setCashRegisterEntries([]); setVersements([]);
    // Le serveur a déjà écrit shopMeta, vendors et shopLicense (essai gratuit
    // de 14 jours) dans le MÊME appel qui a créé l'entreprise — s'il en a
    // renvoyé une, on la reprend telle quelle plutôt que d'en recalculer une
    // localement, pour rester identique à ce qui est réellement en base.
    const trialLicense = serverShopLicense || makeTrialLicense();
    setLicense(trialLicense);
    setTrialUsed(true);
    window.storage.set(`license:${newShop.id}`, JSON.stringify(trialLicense)).catch(() => {});
    window.storage.set("trialUsed", JSON.stringify(true)).catch(() => {});
    if (newShop.backendLinked) {
      // shopMeta, vendors et shopLicense sont déjà en base (écrits par
      // create-shop) : on ne les remet PAS dans la file d'attente pour éviter
      // de les écraser inutilement. Seules les données de démarrage restent à
      // envoyer — moins critique si ça prend un peu de temps à se synchroniser.
      const keys = ["products", "sales", "categories", "suppliers", "expenses", "movements", "inventories", "clients", "orders", "supplierProducts", "avoirs"];
      keys.forEach(api.markDirty);
      const initialValues = {
        products: SEED_PRODUCTS, sales: [], categories: SEED_CATEGORIES, suppliers: SEED_SUPPLIERS,
        expenses: [], movements: [], inventories: [], clients: [], orders: [], supplierProducts: [], avoirs: [],
      };
      try {
        const result = await api.flushSyncQueue((key) => initialValues[key], newShop.id);
        setPendingSync(api.getPendingCount());
        if (result.remaining > 0) {
          pushToast("Entreprise créée — quelques données de démarrage restent à synchroniser, ça se fera automatiquement.", "ok");
        }
      } catch { /* le badge ⏳ restera visible, la synchro en arrière-plan prendra le relais */ }
    }
    pushToast(`Bienvenue, ${newShop.name} !`, "ok");
    setHomeScreenActive(false);
  };

  const handleJoinShopComplete = async (shopObj, pulled, autoRole, autoVendorName, shopLicense) => {
    const newShop = { salesNotificationsEnabled: true, theme: "emeraude", darkMode: false, soundsEnabled: true, ...shopObj };
    // Reconnexion à une entreprise déjà présente : on la met à jour au lieu
    // de l'ajouter une deuxième fois dans la liste.
    const nextShops = uniqueShops([...(shops || []), newShop]);
    const products = pulled.products || SEED_PRODUCTS;
    const avoirsData = Array.isArray(pulled.avoirs) ? pulled.avoirs : [];
    const cashData = ownCashEntries(pulled.cashRegisterEntries, newShop.id);
    const versementsData = ownCashEntries(pulled.versements, newShop.id);
    const salesData = pulled.sales || [];
    const vendorsData = pulled.vendors || [];
    const categoriesData = pulled.categories || SEED_CATEGORIES;
    const suppliersData = pulled.suppliers || SEED_SUPPLIERS;
    const expensesData = pulled.expenses || [];
    const movementsData = pulled.movements || [];
    const inventoriesData = pulled.inventories || [];
    const clientsData = pulled.clients || [];
    const ordersData = pulled.orders || [];
    const supplierProductsData = pulled.supplierProducts || [];
    setShops(nextShops);
    api.setActiveShop(newShop.id);
    window.storage.set("shops", JSON.stringify(nextShops)).catch(() => {});
    window.storage.set("activeShopId", JSON.stringify(newShop.id)).catch(() => {});
    await Promise.all([
      window.storage.set(`products:${newShop.id}`, JSON.stringify(products)),
      window.storage.set(`sales:${newShop.id}`, JSON.stringify(salesData)),
      window.storage.set(`vendors:${newShop.id}`, JSON.stringify(vendorsData)),
      window.storage.set(`categories:${newShop.id}`, JSON.stringify(categoriesData)),
      window.storage.set(`suppliers:${newShop.id}`, JSON.stringify(suppliersData)),
      window.storage.set(`expenses:${newShop.id}`, JSON.stringify(expensesData)),
      window.storage.set(`movements:${newShop.id}`, JSON.stringify(movementsData)),
      window.storage.set(`inventories:${newShop.id}`, JSON.stringify(inventoriesData)),
      window.storage.set(`clients:${newShop.id}`, JSON.stringify(clientsData)),
      window.storage.set(`orders:${newShop.id}`, JSON.stringify(ordersData)),
      window.storage.set(`supplierProducts:${newShop.id}`, JSON.stringify(supplierProductsData)),
      window.storage.set(`avoirs:${newShop.id}`, JSON.stringify(avoirsData)),
      window.storage.set(`cashRegisterEntries:${newShop.id}`, JSON.stringify(cashData)),
      window.storage.set(`versements:${newShop.id}`, JSON.stringify(versementsData)),
    ]).catch(() => {});
    setActiveShopId(newShop.id);
    setProducts(products); setSales(salesData); setVendors(vendorsData); setSuppliers(suppliersData);
    setExpenses(expensesData); setCategories(categoriesData); setMovements(movementsData); setInventories(inventoriesData); setClients(clientsData); setOrders(ordersData); setSupplierProducts(supplierProductsData); setAvoirs(avoirsData); setCashRegisterEntries(cashData); setVersements(versementsData);
    if (shopLicense) {
      setLicense(shopLicense);
      window.storage.set(`license:${newShop.id}`, JSON.stringify(shopLicense)).catch(() => {});
      if (shopLicense.planId === "trial") { setTrialUsed(true); window.storage.set("trialUsed", JSON.stringify(true)).catch(() => {}); }
    }
    if (autoRole) {
      setRole(autoRole);
      setCurrentVendorName(autoVendorName || (autoRole === "admin" ? (newShop.adminDisplayName?.trim() || "Administrateur") : "Administrateur"));
      setView("sell");
      pushToast(`Bon retour sur "${newShop.name}" !`, "ok");
    } else {
      pushToast(`Connecté à "${newShop.name}" !`, "ok");
    }
    setHomeScreenActive(false);
  };

  const handleCreateShop = async (newShop, vendor) => {
    // Création côté serveur d'abord : l'entreprise n'est ajoutée localement
    // qu'une fois la liaison de l'appareil confirmée. L'appareil peut être lié
    // à plusieurs entreprises, l'entreprise active n'est donc pas modifiée ici.
    let linkedShop = newShop;
    let linkedVendor = vendor;
    let serverShopLicense = null;
    try {
      const backend = await api.createShopBackend({
        name: newShop.name, type: newShop.type, currency: newShop.currency,
        adminPin: DEFAULT_ADMIN_PIN, vendorName: vendor.name, vendorPin: vendor.pin,
      });
      linkedShop = {
        ...newShop,
        id: backend.shop_id,
        joinCode: backend.join_code,
        backendLinked: true,
        adminPinHash: api.hashPin(DEFAULT_ADMIN_PIN),
      };
      delete linkedShop.adminPin;
      linkedVendor = backend.vendor
        ? { id: backend.vendor.id, name: backend.vendor.name, pinHash: api.hashPin(vendor.pin), joinCode: backend.vendor.joinCode }
        : { id: vendor.id, name: vendor.name, pinHash: api.hashPin(vendor.pin), joinCode: generateShopJoinCode() };
      serverShopLicense = backend.shop_license || null;
    } catch (e) {
      pushToast(
        api.networkErrorText(e, "créer une entreprise") || e.message || "Erreur lors de la création, réessayez.",
        "error",
      );
      return false;
    }

    const nextShops = uniqueShops([...shops, linkedShop]);
    setShops(nextShops);
    window.storage.set("shops", JSON.stringify(nextShops)).catch(() => {});
    await seedShopData(linkedShop.id, linkedVendor);
    // La licence d'essai est déjà écrite en base par le serveur (même appel
    // que la création) — on l'enregistre localement telle quelle.
    const trialLicense = serverShopLicense || makeTrialLicense();
    window.storage.set(`license:${linkedShop.id}`, JSON.stringify(trialLicense)).catch(() => {});

    // shopMeta, vendors et shopLicense sont déjà en base : seules les
    // données de démarrage (produits/catégories/fournisseurs de départ)
    // restent à synchroniser, moins critique si ça prend un peu de temps.
    const initialValues = {
      products: SEED_PRODUCTS, sales: [], categories: SEED_CATEGORIES, suppliers: SEED_SUPPLIERS,
      expenses: [], movements: [], inventories: [], clients: [], avoirs: [],
    };
    Object.keys(initialValues).forEach((k) => api.markDirty(k, linkedShop.id));
    try {
      const result = await api.flushSyncQueue((key) => initialValues[key], linkedShop.id);
      if (result.remaining > 0) {
        pushToast(`Entreprise "${linkedShop.name}" créée — quelques données de démarrage restent à synchroniser.`, "ok");
        return true;
      }
    } catch { /* la synchro de fond reprendra la main */ }

    pushToast(`Entreprise "${linkedShop.name}" créée`, "ok");
    return true;
  };

  const handleSwitchShop = async (shopId) => {
    if (shopId === activeShopId) return;
    const data = await loadShopData(shopId);
    setProducts(data.products); setSales(data.sales); setVendors(data.vendors); setSuppliers(data.suppliers); setExpenses(data.expenses); setCategories(data.categories); setMovements(data.movements); setInventories(data.inventories); setClients(data.clients); setOrders(data.orders); setSupplierProducts(data.supplierProducts); setAvoirs(data.avoirs); setCashRegisterEntries(data.cashRegisterEntries || []); setVersements(data.versements || []);
    api.setActiveShop(shopId);
    setActiveShopId(shopId);
    setPendingSync(api.getPendingCount(shopId));
    window.storage.set("activeShopId", JSON.stringify(shopId)).catch(() => {});
    setRole(null); setCurrentVendorName(""); setCart([]); setView("sell"); setNotifications([]); setUnreadCount(0); setNotifPanelOpen(false);
    window.storage.delete("sessionRole").catch(() => {});
    window.storage.delete("sessionVendorName").catch(() => {});
    // La licence est propre à CHAQUE entreprise — sans ça, changer d'entreprise
    // gardait affichée (et active) la licence de l'entreprise précédente, ce
    // qui pouvait laisser l'accès ouvert à une entreprise dont la licence avait
    // en réalité expiré. On recharge la copie locale immédiatement...
    const nextLicense = await loadLocalLicense(shopId);
    setLicense(nextLicense);
    // ...puis on revérifie auprès du serveur (si l'entreprise y est liée), au
    // cas où la copie locale de CET appareil n'aurait jamais appris qu'une
    // licence a expiré ou a été activée depuis un autre appareil / le panneau
    // propriétaire.
    const switchedShop = shops.find((s) => s.id === shopId);
    if (switchedShop?.backendLinked) {
      api.pullKey("shopLicense", shopId).then((fresh) => {
        if (!fresh) return;
        setLicense(fresh);
        window.storage.set(`license:${shopId}`, JSON.stringify(fresh)).catch(() => {});
      }).catch(() => {});
    }
    pushToast("Entreprise changée", "ok");
  };

  const handleDeleteShop = async (shopId) => {
    if (shops.length <= 1) { pushToast("Vous devez garder au moins une entreprise", "error"); return; }
    const nextShops = shops.filter((s) => s.id !== shopId);
    setShops(nextShops);
    window.storage.set("shops", JSON.stringify(nextShops)).catch(() => {});
    await Promise.all([
      safeDelete(`products:${shopId}`), safeDelete(`sales:${shopId}`), safeDelete(`vendors:${shopId}`),
      safeDelete(`suppliers:${shopId}`), safeDelete(`expenses:${shopId}`), safeDelete(`categories:${shopId}`), safeDelete(`movements:${shopId}`), safeDelete(`inventories:${shopId}`), safeDelete(`clients:${shopId}`), safeDelete(`orders:${shopId}`), safeDelete(`supplierProducts:${shopId}`),
    ]);
    // Retire aussi la liaison de l'appareil et la file d'attente de cette
    // boutique, sinon des clés orphelines resteraient en attente indéfiniment.
    api.unlinkShop(shopId);
    pushToast("Entreprise supprimée", "ok");
    if (shopId === activeShopId) await handleSwitchShop(nextShops[0].id);
  };

  useEffect(() => {
    if (role === "admin" && products) {
      const n = products.filter((p) => p.stock <= p.minStock).length;
      if (n > 0) pushToast(`${n} produit${n > 1 ? "s" : ""} en stock bas`, "error");
    }
    if (role === "admin" && licenseStatus === "expiring" && license?.expiresAt) {
      const daysLeft = Math.ceil((new Date(license.expiresAt) - Date.now()) / MS_DAY);
      pushToast(`Licence expire dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`, "error");
    }
    if (role === "admin" && licenseStatus === "expired") {
      pushToast("Licence expirée — renouvelez pour continuer à encaisser", "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // Notifications de vente entre appareils : le vendeur et le propriétaire ont
  // chacun leur appareil, donc on détecte à distance les ventes, modifications
  // et suppressions faites sur l'autre appareil et on notifie ici. Les
  // modifications/suppressions ne peuvent venir que de l'administrateur — sur
  // l'appareil admin lui-même, l'action locale notifie déjà immédiatement
  // (voir handleUpdateSale/handleDeleteSale), donc on ne les redétecte pas ici
  // pour éviter un doublon.
  useEffect(() => {
    if (!role || !shop?.salesNotificationsEnabled || !activeShopId) return;
    let known = new Map((sales || []).map((s) => [s.id, { total: s.total, paymentMethod: s.paymentMethod }]));
    const interval = setInterval(async () => {
      try {
        const latest = await loadKey(`sales:${activeShopId}`, []);
        const latestMap = new Map(latest.map((s) => [s.id, s]));
        const newOnes = latest.filter((s) => !known.has(s.id) && s.vendor !== currentVendorName);
        const editedOnes = role !== "admin" ? latest.filter((s) => {
          const prev = known.get(s.id);
          return prev && (prev.total !== s.total || prev.paymentMethod !== s.paymentMethod);
        }) : [];
        const deletedIds = role !== "admin" ? [...known.keys()].filter((id) => !latestMap.has(id)) : [];

        if (newOnes.length > 0) {
          newOnes.forEach((s) => {
            pushToast(`Nouvelle vente : ${formatMoney(s.total, shop.currency)} par ${s.vendor}`, "ok");
          });
          setNotifications((prev) => [
            ...newOnes.map((s) => ({ id: s.id, vendor: s.vendor, total: s.total, date: s.date, paymentMethod: s.paymentMethod })),
            ...prev,
          ].slice(0, 30));
          setUnreadCount((c) => c + newOnes.length);
        }
        if (editedOnes.length > 0) {
          setNotifications((prev) => [
            ...editedOnes.map((s) => ({ id: `edit-${s.id}-${Date.now()}`, type: "sale_edited", receiptNumber: receiptNumber(s.id), total: s.total, date: new Date().toISOString() })),
            ...prev,
          ].slice(0, 30));
          setUnreadCount((c) => c + editedOnes.length);
        }
        if (deletedIds.length > 0) {
          setNotifications((prev) => [
            ...deletedIds.map((id) => ({ id: `del-${id}-${Date.now()}`, type: "sale_deleted", receiptNumber: id.slice(0, 6).toUpperCase(), total: known.get(id)?.total, date: new Date().toISOString() })),
            ...prev,
          ].slice(0, 30));
          setUnreadCount((c) => c + deletedIds.length);
        }
        if (newOnes.length > 0 || editedOnes.length > 0 || deletedIds.length > 0) setSales(latest);
        known = new Map(latest.map((s) => [s.id, { total: s.total, paymentMethod: s.paymentMethod }]));
      } catch { /* ignore */ }
    }, 8000);
    return () => clearInterval(interval);
  }, [role, activeShopId, shop?.salesNotificationsEnabled, shop?.currency, currentVendorName]);

  // Rappel quotidien : essai gratuit en cours, et produits en stock bas
  useEffect(() => {
    if (role !== "admin" || !activeShopId) return;
    const todayKey = new Date().toDateString();

    if (license?.planId === "trial" && licenseStatus !== "expired") {
      const lastShown = localStorage.getItem(`notif_trial_${activeShopId}`);
      if (lastShown !== todayKey) {
        const daysLeft = license.expiresAt ? Math.max(0, Math.ceil((new Date(license.expiresAt) - Date.now()) / MS_DAY)) : 0;
        setNotifications((prev) => [{ id: `trial-${todayKey}`, type: "trial", daysLeft, date: new Date().toISOString() }, ...prev].slice(0, 30));
        setUnreadCount((c) => c + 1);
        localStorage.setItem(`notif_trial_${activeShopId}`, todayKey);
        if (daysLeft <= 5) speak(`Attention, votre licence expire dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}.`, voiceOn(shop, "license"));
      }
    }

    if (products && products.length > 0) {
      const lastShownStock = localStorage.getItem(`notif_stock_${activeShopId}`);
      if (lastShownStock !== todayKey) {
        const lowStock = products.filter((p) => p.stock <= p.minStock);
        if (lowStock.length > 0) {
          setNotifications((prev) => [{ id: `stock-${todayKey}`, type: "lowstock", count: lowStock.length, names: lowStock.slice(0, 3).map((p) => p.name), date: new Date().toISOString() }, ...prev].slice(0, 30));
          setUnreadCount((c) => c + 1);
          speak(`${lowStock.length} produit${lowStock.length > 1 ? "s sont" : " est"} en stock bas.`, voiceOn(shop, "stock"));
        }
        localStorage.setItem(`notif_stock_${activeShopId}`, todayKey);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, activeShopId, license?.planId, products]);

  // initialCashPayment : utilisé quand une vente en espèces est convertie en
  // crédit parce que le montant reçu était insuffisant — le montant déjà
  // encaissé est enregistré comme premier règlement du crédit (voir
  // SellScreen.confirmCheckout), le solde restant apparaissant dans
  // CreditsScreen comme pour tout crédit partiellement réglé.
  const handleCheckout = (cartItems, total, paymentMethod, clientId, clientName, amountReceived, initialCashPayment) => {
    const nextProducts = products.map((p) => { const line = cartItems.find((i) => i.id === p.id); return line ? { ...p, stock: p.stock - line.qty } : p; });
    const paidNow = initialCashPayment > 0 ? initialCashPayment : 0;
    const payments = paidNow > 0 ? [{ amount: paidNow, date: new Date().toISOString(), by: currentVendorName }] : undefined;
    const sale = {
      id: uid(), date: new Date().toISOString(), items: cartItems, total, vendor: currentVendorName, paymentMethod, clientId: clientId || null, clientName: clientId ? clientName : undefined,
      paid: paymentMethod !== "credit" ? true : paidNow >= total,
      amountReceived: amountReceived ?? null,
      changeDue: amountReceived != null ? Math.max(0, amountReceived - total) : null,
      payments,
    };
    saveProducts(nextProducts);
    saveSales([...sales, sale]);
    const saleMovements = cartItems.map((i) => {
      const before = i.product.stock;
      return { id: uid(), date: sale.date, productId: i.product.id, productName: i.product.name, type: "vente", delta: -i.qty, before, after: before - i.qty, author: currentVendorName, note: "" };
    });
    saveMovements([...saleMovements, ...movements]);
    setCart([]);
    setNotifications((prev) => [{ id: sale.id, vendor: sale.vendor, total: sale.total, date: sale.date, paymentMethod: sale.paymentMethod }, ...prev].slice(0, 30));
    setUnreadCount((c) => c + 1);
    pushSaleToast(sale.total, PAYMENT_LABELS[sale.paymentMethod]);
    return sale;
  };

  // Notification flash "vente enregistrée" — glisse depuis la droite, reste
  // 7 secondes puis ressort en glissant. Plusieurs ventes rapprochées
  // s'empilent, chacune avec son propre minuteur indépendant.
  const pushSaleToast = (amount, paymentLabel) => {
    const id = uid();
    setSaleToasts((prev) => [...prev, { id, amount, paymentLabel, leaving: false }]);
    setTimeout(() => {
      setSaleToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
      setTimeout(() => setSaleToasts((prev) => prev.filter((t) => t.id !== id)), 320);
    }, 7000);
  };

  const handleRestoreBackup = (bundle) => {
    const next = {
      products: bundle.products || [],
      sales: bundle.sales || [],
      categories: bundle.categories || SEED_CATEGORIES,
      suppliers: bundle.suppliers || [],
      expenses: bundle.expenses || [],
      movements: bundle.movements || [],
      inventories: bundle.inventories || [],
      clients: bundle.clients || [],
      vendors: bundle.vendors || [],
      orders: bundle.orders || [],
      supplierProducts: bundle.supplierProducts || [],
      avoirs: bundle.avoirs || [],
      cashRegisterEntries: (Array.isArray(bundle.cashRegisterEntries) ? bundle.cashRegisterEntries : []).map((e) => ({ ...e, shopId: activeShopId })),
      versements: (Array.isArray(bundle.versements) ? bundle.versements : []).map((v) => ({ ...v, shopId: activeShopId })),
    };
    setProducts(next.products); setSales(next.sales); setCategories(next.categories); setSuppliers(next.suppliers);
    setExpenses(next.expenses); setMovements(next.movements); setInventories(next.inventories); setClients(next.clients); setVendors(next.vendors); setOrders(next.orders); setSupplierProducts(next.supplierProducts); setAvoirs(next.avoirs); setCashRegisterEntries(next.cashRegisterEntries); setVersements(next.versements);
    window.storage.set(`products:${activeShopId}`, JSON.stringify(next.products)).catch(() => {});
    window.storage.set(`sales:${activeShopId}`, JSON.stringify(next.sales)).catch(() => {});
    window.storage.set(`categories:${activeShopId}`, JSON.stringify(next.categories)).catch(() => {});
    window.storage.set(`suppliers:${activeShopId}`, JSON.stringify(next.suppliers)).catch(() => {});
    window.storage.set(`expenses:${activeShopId}`, JSON.stringify(next.expenses)).catch(() => {});
    window.storage.set(`movements:${activeShopId}`, JSON.stringify(next.movements)).catch(() => {});
    window.storage.set(`inventories:${activeShopId}`, JSON.stringify(next.inventories)).catch(() => {});
    window.storage.set(`clients:${activeShopId}`, JSON.stringify(next.clients)).catch(() => {});
    window.storage.set(`vendors:${activeShopId}`, JSON.stringify(next.vendors)).catch(() => {});
    window.storage.set(`orders:${activeShopId}`, JSON.stringify(next.orders)).catch(() => {});
    window.storage.set(`supplierProducts:${activeShopId}`, JSON.stringify(next.supplierProducts)).catch(() => {});
    window.storage.set(`avoirs:${activeShopId}`, JSON.stringify(next.avoirs)).catch(() => {});
    window.storage.set(`cashRegisterEntries:${activeShopId}`, JSON.stringify(next.cashRegisterEntries)).catch(() => {});
    window.storage.set(`versements:${activeShopId}`, JSON.stringify(next.versements)).catch(() => {});
    // Réglages de la boutique (devise, thème, langue, fidélité, mode sombre,
    // sons, code administrateur) — sans ça, une restauration recréait les
    // ventes/stocks/etc. mais remettait la boutique à ses réglages par défaut.
    if (bundle.shopSettings) {
      saveShopMeta({ ...shop, ...bundle.shopSettings });
    }
    // Entreprise synchronisée : la restauration part aussi sur le serveur,
    // sinon la synchronisation suivante remettrait les anciennes données.
    if (shop?.backendLinked) {
      Object.entries(next).forEach(([key, value]) => {
        api.markDirty(key);
        api.syncKeyNow(key, value).then(() => setPendingSync(api.getPendingCount()));
      });
      setPendingSync(api.getPendingCount());
    }
  };

  const handleRestoreServerBackup = async (backupId, dayLabel) => {
    const b = await api.getBackup(backupId, activeShopId);
    if (!b?.data || typeof b.data !== "object") throw new Error("Sauvegarde vide");
    const { shopMeta, auditLog: _ignored, ...rest } = b.data;
    const settings = { ...(shopMeta || {}) };
    delete settings.name;
    handleRestoreBackup({ ...rest, shopSettings: Object.keys(settings).length ? settings : undefined });
    logAudit("securite", `Données restaurées depuis la sauvegarde automatique (${dayLabel})`);
  };

  // Ajoute une notification générique à la cloche (badge non-lu inclus).
  const pushNotification = (entry) => {
    setNotifications((prev) => [{ id: `${entry.type}-${Date.now()}`, date: new Date().toISOString(), ...entry }, ...prev].slice(0, 30));
    setUnreadCount((c) => c + 1);
    // Annonce vocale locale (les ventes et dépenses parlent déjà au moment
    // de l'action, on ne les répète pas ici).
    const money = (n) => spokenAmount(formatMoney(Number(n) || 0, shop?.currency));
    if (entry.type === "stock_alert") announce("stock", entry.level === 0 ? `Rupture de stock : ${entry.productName}.` : `Stock bas : ${entry.productName}, il en reste ${entry.stock}.`);
    else if (entry.type === "order_validated") announce("order", `Commande ${entry.supplierName} reçue${entry.total ? `, ${money(entry.total)}` : ""}.`);
    else if (entry.type === "stock_movement") announce("movement", `${entry.count || 1} mouvement${entry.count > 1 ? "s" : ""} de stock enregistré${entry.count > 1 ? "s" : ""}.`);
    else if (entry.type === "credit_settled") announce("credit", `Crédit encaissé${entry.clientName ? ` pour ${entry.clientName}` : ""} : ${money(entry.total)}.`);
    else if (entry.type === "expiry_alert") announce("stock", `Péremption : ${entry.count} lot${entry.count > 1 ? "s" : ""} à vérifier, dont ${entry.first}.`);
    else if (entry.type === "sale_returned") announce("cancel", `Retour client sur la vente ${entry.receiptNumber}, ${money(entry.amount)}${entry.refund > 0 ? `, ${money(entry.refund)} remboursés en ${REFUND_LABELS[entry.refundMode] || ""}` : ""}.`);
  };

  // Encaisse un remboursement de crédit — total ou partiel. `amount` est le
  // montant reçu maintenant (pas forcément le solde total) ; il est ajouté à
  // l'historique des paiements de la vente et à la recette du jour même
  // (jour de l'encaissement, pas jour de la vente d'origine). Le crédit ne
  // passe "réglé" que lorsque la somme des paiements couvre le total.
  const handleSettleCredit = (saleId, amount) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return null;
    const paidBy = role === "admin" ? (shop?.adminDisplayName?.trim() || "Administrateur") : currentVendorName;
    const paidDate = new Date().toISOString();
    const alreadyPaid = creditPaidSoFar(sale);
    const remaining = Math.max(0, sale.total - alreadyPaid);
    const received = Math.min(Math.max(0, Number(amount) || 0), remaining);
    if (received <= 0) return sale;
    const payments = [...creditPaymentsOf(sale), { amount: received, date: paidDate, by: paidBy }];
    const fullyPaid = alreadyPaid + received >= sale.total - 0.5;
    const nextSales = sales.map((s) => (s.id === saleId ? { ...s, payments, paid: fullyPaid, paidBy, paidDate } : s));
    saveSales(nextSales);
    const settled = nextSales.find((s) => s.id === saleId);
    pushToast(fullyPaid ? "Crédit encaissé en totalité" : "Remboursement partiel enregistré", "ok");
    pushNotification({ type: "credit_settled", clientName: settled?.clientName || settled?.vendor, total: received, by: paidBy, partial: !fullyPaid });
    logAudit("caisse", `Crédit encaissé${settled?.clientName ? ` · ${settled.clientName}` : ""} : ${formatMoney(received, shop?.currency)}${fullyPaid ? " (soldé)" : " (partiel)"}`, { amount: received, saleId });
    return settled;
  };

  // Avoir monnaie : le client a payé en espèces mais la boutique n'a pas pu
  // lui rendre la monnaie — enregistré comme une somme due, séparément de la
  // vente elle-même (qui reste normale : le client a bien payé le total).
  const handleCreateMoneyAvoir = (amount, clientName, saleId) => {
    if (!amount || amount <= 0) return;
    const author = role === "admin" ? (shop?.adminDisplayName?.trim() || "Administrateur") : currentVendorName;
    const avoir = { id: uid(), type: "monnaie", clientName: clientName || "Client", amount, date: new Date().toISOString(), vendor: author, settled: false, saleId: saleId || null, redemptions: [] };
    saveAvoirs([avoir, ...avoirs]);
    pushNotification?.({ type: "avoir_created", avoirType: "monnaie", clientName: avoir.clientName, amount });
    return avoir;
  };

  // Avoir produit : des produits sont dus à un client (mis de côté, pas
  // encore remis). Par défaut le stock part comme pour une vente, puisque
  // aucune recette n'est comptabilisée pour ce geste. Si les produits ont
  // déjà été vendus par ailleurs (ex. Mobile Money + avoir produit dans
  // SellScreen, où la vente elle-même décompte déjà le stock), on passe
  // skipStock=true pour ne pas décompter deux fois.
  const handleCreateProductAvoir = (items, clientName, { skipStock = false, saleId = null } = {}) => {
    if (!items || items.length === 0) return null;
    if (!skipStock) {
      const nextProducts = products.map((p) => {
        const line = items.find((i) => i.product.id === p.id);
        return line ? { ...p, stock: Math.max(0, p.stock - line.qty) } : p;
      });
      saveProducts(nextProducts);
    }
    const author = role === "admin" ? (shop?.adminDisplayName?.trim() || "Administrateur") : currentVendorName;
    const avoir = {
      id: uid(), type: "produit", clientName: clientName || "Client",
      items: items.map((i) => ({ productId: i.product.id, name: i.product.name, qty: i.qty, price: i.product.price })),
      date: new Date().toISOString(), vendor: author, settled: false, saleId: saleId || null, history: [],
    };
    saveAvoirs([avoir, ...avoirs]);
    pushNotification?.({ type: "avoir_created", avoirType: "produit", clientName: avoir.clientName, itemCount: items.length });
    pushToast(`Avoir produit enregistré pour ${avoir.clientName}`, "ok");
    return avoir;
  };

  // Création ATOMIQUE d'un avoir produit ET d'un avoir monnaie liés à la même
  // vente (cas "avoir produit" + "avoir monnaie" activés ensemble dans le
  // panier). Un seul appel saveAvoirs : appeler handleCreateProductAvoir puis
  // handleCreateMoneyAvoir séparément lisait deux fois le même état `avoirs`
  // non encore rafraîchi entre les deux appels, et le second écrasait le
  // premier — l'avoir produit disparaissait silencieusement. Le lien entre
  // les deux (moneyAvoir.saleId === productAvoir.id) permet à AvoirsScreen de
  // les afficher regroupés tant qu'ils sont en cours.
  const handleCreateProductAndMoneyAvoir = (items, moneyAmount, clientName) => {
    if (!items || items.length === 0) return { productAvoir: null, moneyAvoir: null };
    const nextProducts = products.map((p) => {
      const line = items.find((i) => i.product.id === p.id);
      return line ? { ...p, stock: Math.max(0, p.stock - line.qty) } : p;
    });
    saveProducts(nextProducts);
    const author = role === "admin" ? (shop?.adminDisplayName?.trim() || "Administrateur") : currentVendorName;
    const now = new Date().toISOString();
    const productAvoir = {
      id: uid(), type: "produit", clientName: clientName || "Client",
      items: items.map((i) => ({ productId: i.product.id, name: i.product.name, qty: i.qty, price: i.product.price })),
      date: now, vendor: author, settled: false, saleId: null, history: [],
    };
    const moneyAvoir = moneyAmount > 0
      ? { id: uid(), type: "monnaie", clientName: clientName || "Client", amount: moneyAmount, date: now, vendor: author, settled: false, saleId: productAvoir.id, redemptions: [] }
      : null;
    saveAvoirs(moneyAvoir ? [productAvoir, moneyAvoir, ...avoirs] : [productAvoir, ...avoirs]);
    pushNotification?.({ type: "avoir_created", avoirType: "produit", clientName: productAvoir.clientName, itemCount: items.length });
    pushToast(`Avoir enregistré pour ${productAvoir.clientName}`, "ok");
    return { productAvoir, moneyAvoir };
  };

  // Reprise (totale ou partielle) d'un avoir monnaie : `amount` est la somme
  // rendue maintenant. Journalisée dans `redemptions` pour l'historique du
  // reçu détaillé ; l'avoir passe soldé quand tout a été rendu.
  const handleRedeemMoneyAvoir = (avoirId, amount) => {
    try {
      const avoir = avoirs.find((a) => a.id === avoirId);
      if (!avoir) return null;
      const already = (avoir.redemptions || []).reduce((s, r) => s + r.amount, 0);
      const remaining = Math.max(0, avoir.amount - already);
      const given = Math.min(Math.max(0, Number(amount) || 0), remaining);
      if (given <= 0) return avoir;
      const by = role === "admin" ? (shop?.adminDisplayName?.trim() || "Administrateur") : currentVendorName;
      const now = new Date().toISOString();
      const redemptions = [...(avoir.redemptions || []), { amount: given, date: now, by }];
      const fullySettled = already + given >= avoir.amount - 0.5;
      const nextAvoirs = avoirs.map((a) => (a.id === avoirId ? { ...a, redemptions, settled: fullySettled, settledDate: fullySettled ? now : a.settledDate } : a));
      saveAvoirs(nextAvoirs);
      pushToast(fullySettled ? "Avoir monnaie soldé" : "Remise partielle enregistrée", "ok");
      return nextAvoirs.find((a) => a.id === avoirId);
    } catch (e) {
      pushToast("Impossible d'enregistrer la remise de monnaie", "error");
      return null;
    }
  };

  // Reprise (totale ou partielle) d'un avoir produit : `selectedItems` est la
  // liste des lignes (productId, name, qty, price) que le client récupère
  // maintenant. Les quantités déjà remises sont soustraites des quantités
  // d'origine pour obtenir les quantités restantes ; l'avoir passe soldé
  // quand toutes les quantités ont été remises.
  const handleRedeemProductAvoir = (avoirId, selectedItems) => {
    try {
      const avoir = avoirs.find((a) => a.id === avoirId);
      if (!avoir || !selectedItems || selectedItems.length === 0) return null;
      const by = role === "admin" ? (shop?.adminDisplayName?.trim() || "Administrateur") : currentVendorName;
      const now = new Date().toISOString();
      const history = [...(avoir.history || []), { date: now, by, items: selectedItems.map((i) => ({ productId: i.productId, name: i.name, qty: i.qty, price: i.price })) }];
      const takenByProduct = {};
      history.forEach((h) => h.items.forEach((i) => { takenByProduct[i.productId] = (takenByProduct[i.productId] || 0) + i.qty; }));
      const remainingQty = (avoir.items || []).reduce((s, i) => s + Math.max(0, i.qty - (takenByProduct[i.productId] || 0)), 0);
      const fullySettled = remainingQty <= 0;
      const nextAvoirs = avoirs.map((a) => (a.id === avoirId ? { ...a, history, settled: fullySettled, settledDate: fullySettled ? now : a.settledDate } : a));
      saveAvoirs(nextAvoirs);
      pushToast(fullySettled ? "Avoir produit soldé" : "Remise partielle enregistrée", "ok");
      return nextAvoirs.find((a) => a.id === avoirId);
    } catch (e) {
      pushToast("Impossible d'enregistrer la remise de produits", "error");
      return null;
    }
  };

  // Supprime une vente déjà enregistrée : restitue le stock vendu et journalise
  // l'annulation. Réservé à l'administrateur (contrôlé côté UI dans HistoryScreen).
  const handleDeleteSale = (saleId) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;
    const nextProducts = products.map((p) => {
      const line = sale.items.find((i) => i.id === p.id);
      return line ? { ...p, stock: p.stock + line.qty } : p;
    });
    const cancelMovements = sale.items.map((i) => {
      const p = nextProducts.find((pp) => pp.id === i.id);
      const before = p ? p.stock - i.qty : 0;
      return { id: uid(), date: new Date().toISOString(), productId: i.id, productName: i.product?.name || "?", type: "ajustement", delta: i.qty, before, after: before + i.qty, author: currentVendorName || "Administrateur", note: "Suppression de vente" };
    });
    saveProducts(nextProducts);
    saveMovements([...cancelMovements, ...movements]);
    saveSales(sales.filter((s) => s.id !== saleId));
    logAudit("vente", `Vente N° ${receiptNumber(saleId)} supprimée (${sale.items.map((i) => `${i.qty}× ${i.product?.name || "?"}`).join(", ")})`, { amount: -(Number(sale.total) || 0), saleId });
    setNotifications((prev) => [{ id: `del-${saleId}-${Date.now()}`, type: "sale_deleted", receiptNumber: saleId.slice(0, 6).toUpperCase(), total: sale.total, date: new Date().toISOString() }, ...prev].slice(0, 30));
    setUnreadCount((c) => c + 1);
    pushToast("Vente supprimée, stock restitué", "ok");
  };

  // Modifie une vente déjà enregistrée (quantités, articles retirés, mode de
  // paiement) et ajuste le stock en conséquence. Réservé à l'administrateur.
  const handleUpdateSale = (saleId, newItems, newPaymentMethod) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;
    const oldQtyById = Object.fromEntries(sale.items.map((i) => [i.id, i.qty]));
    const newQtyById = Object.fromEntries(newItems.map((i) => [i.id, i.qty]));
    const affectedIds = new Set([...Object.keys(oldQtyById), ...Object.keys(newQtyById)]);
    const nextProducts = products.map((p) => {
      if (!affectedIds.has(p.id)) return p;
      const delta = (oldQtyById[p.id] || 0) - (newQtyById[p.id] || 0); // qty en moins vendue => stock qui remonte
      return delta !== 0 ? { ...p, stock: p.stock + delta } : p;
    });
    const editMovements = [...affectedIds].filter((id) => (oldQtyById[id] || 0) !== (newQtyById[id] || 0)).map((id) => {
      const p = nextProducts.find((pp) => pp.id === id);
      const delta = (oldQtyById[id] || 0) - (newQtyById[id] || 0);
      const before = p ? p.stock - delta : 0;
      return { id: uid(), date: new Date().toISOString(), productId: id, productName: p?.name || "?", type: "ajustement", delta, before, after: before + delta, author: currentVendorName || "Administrateur", note: "Modification de vente" };
    });
    const newTotal = newItems.reduce((s, i) => s + computeItemTotal(i.product, i.qty), 0);
    const paymentChangedToCredit = newPaymentMethod === "credit" && sale.paymentMethod !== "credit";
    const paymentChangedFromCredit = newPaymentMethod !== "credit" && sale.paymentMethod === "credit";
    const nextSale = {
      ...sale, items: newItems, total: newTotal, paymentMethod: newPaymentMethod,
      paid: paymentChangedToCredit ? false : paymentChangedFromCredit ? true : sale.paid,
    };
    saveProducts(nextProducts);
    if (editMovements.length > 0) saveMovements([...editMovements, ...movements]);
    saveSales(sales.map((s) => (s.id === saleId ? nextSale : s)));
    logAudit("vente", `Vente N° ${receiptNumber(saleId)} modifiée : ${formatMoney(Number(sale.total) || 0, shop?.currency)} → ${formatMoney(newTotal, shop?.currency)}${newPaymentMethod !== sale.paymentMethod ? ` · paiement ${PAYMENT_LABELS[sale.paymentMethod]} → ${PAYMENT_LABELS[newPaymentMethod]}` : ""}`, { amount: newTotal - (Number(sale.total) || 0), saleId });
    setNotifications((prev) => [{ id: `edit-${saleId}-${Date.now()}`, type: "sale_edited", receiptNumber: saleId.slice(0, 6).toUpperCase(), total: newTotal, date: new Date().toISOString() }, ...prev].slice(0, 30));
    setUnreadCount((c) => c + 1);
    pushToast("Vente modifiée", "ok");
  };

  // Retour produit après encaissement : diminue la vente d'origine des
  // articles rendus, remet (ou non) les articles en stock, rembourse le
  // client (espèces, Mobile Money, avoir) ou déduit le montant de son crédit.
  const handleReturnSale = (saleId, { lines, reason, note, restock, refundMode } = {}) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale || !Array.isArray(lines) || lines.length === 0) return null;
    const by = role === "admin" ? (shop?.adminDisplayName?.trim() || "Administrateur") : currentVendorName;
    const now = new Date().toISOString();
    const qtyById = Object.fromEntries(lines.map((l) => [l.id, Math.max(0, Number(l.qty) || 0)]));
    const returnedItems = [];
    const newItems = [];
    sale.items.forEach((i) => {
      const q = Math.min(i.qty, qtyById[i.id] || 0);
      if (q > 0) returnedItems.push({ id: i.id, name: i.product?.name || "?", qty: q, value: computeItemTotal(i.product, i.qty) - computeItemTotal(i.product, i.qty - q) });
      if (i.qty - q > 0) newItems.push({ ...i, qty: i.qty - q });
    });
    if (returnedItems.length === 0) return null;
    const oldSum = sale.items.reduce((t, i) => t + computeItemTotal(i.product, i.qty), 0);
    const newSum = newItems.reduce((t, i) => t + computeItemTotal(i.product, i.qty), 0);
    const amount = Math.max(0, Math.min(Number(sale.total) || 0, oldSum - newSum));
    const newTotal = Math.max(0, (Number(sale.total) || 0) - amount);
    const isCredit = sale.paymentMethod === "credit";
    const paidSoFar = isCredit ? creditPaidSoFar(sale) : Number(sale.total) || 0;
    const refund = isCredit ? Math.max(0, paidSoFar - newTotal) : amount;
    const creditReduced = Math.max(0, amount - refund);
    const mode = refund > 0 ? (["especes", "mobile", "avoir"].includes(refundMode) ? refundMode : "especes") : "credit";
    const ret = { id: uid(), date: now, by, reason: reason || "Autre", note: (note || "").trim(), restocked: !!restock, refundMode: mode, amount, refund, creditReduced, items: returnedItems };
    const becomesPaid = isCredit && !sale.paid && paidSoFar >= newTotal - 0.5;
    const nextSale = {
      ...sale, items: newItems, total: newTotal,
      originalTotal: sale.originalTotal ?? sale.total,
      returns: [...saleReturnsOf(sale), ret],
      ...(becomesPaid ? { paid: true, paidBy: sale.paidBy || by, paidDate: sale.paidDate || now } : {}),
    };
    if (restock) {
      saveProducts(products.map((p) => { const r = returnedItems.find((x) => x.id === p.id); return r ? { ...p, stock: (Number(p.stock) || 0) + r.qty } : p; }));
    }
    const retMovements = returnedItems.map((r) => {
      const p = products.find((pp) => pp.id === r.id);
      const before = Number(p?.stock) || 0;
      const delta = restock ? r.qty : 0;
      return { id: uid(), date: now, productId: r.id, productName: r.name, type: "retour", delta, qty: r.qty, restocked: !!restock, before, after: before + delta, author: by, note: ret.reason, saleId: sale.id, saleDate: sale.date };
    });
    saveMovements([...retMovements, ...movements]);
    saveSales(sales.map((s) => (s.id === saleId ? nextSale : s)));
    if (mode === "avoir") handleCreateMoneyAvoir(refund, sale.clientName || "Client", sale.id);
    logAudit("vente", `Retour client · vente N° ${receiptNumber(sale.id)} : ${returnedItems.map((r) => `${r.qty}× ${r.name}`).join(", ")} (${ret.reason})${refund > 0 ? ` · remboursé ${formatMoney(refund, shop?.currency)} en ${REFUND_LABELS[mode]}` : " · déduit du crédit"}`, { amount: -refund, saleId: sale.id });
    pushNotification({ type: "sale_returned", receiptNumber: receiptNumber(sale.id), amount, refund, refundMode: mode, by, itemCount: returnedItems.reduce((t, r) => t + r.qty, 0) });
    pushToast(refund > 0 ? `Retour enregistré — ${formatMoney(refund, shop?.currency)} à rendre (${REFUND_LABELS[mode]})` : "Retour enregistré — déduit du crédit", "ok");
    return { ret, sale: nextSale };
  };

  // Enregistre (ou met à jour) la facture / proforma / bon de livraison
  // d'une vente : son numéro reste le même à chaque réédition.
  const handleSaveInvoice = (saleId, invoice) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;
    const others = (sale.invoices || []).filter((i) => i.type !== invoice.type);
    const isNew = !(sale.invoices || []).some((i) => i.type === invoice.type);
    const inv = { ...invoice, by: actorName() };
    saveSales(sales.map((s) => (s.id === saleId ? { ...s, invoices: [...others, inv] } : s)));
    if (isNew) logAudit("vente", `${INVOICE_TYPES[invoice.type]?.label || "Document"} ${invoice.number} · ${invoice.client?.name || "client"} · ${formatMoney(Number(sale.total) || 0, shop?.currency)}`, { saleId });
  };

  // Prévisions : prépare une commande « en attente » par fournisseur.
  const handleCreateForecastOrders = (newOrders) => {
    if (!newOrders?.length) return;
    saveOrders([...newOrders, ...(orders || [])]);
    const names = newOrders.map((o) => suppliers.find((s) => s.id === o.supplierId)?.name || "fournisseur").join(", ");
    logAudit("stock", `Commande${newOrders.length > 1 ? "s" : ""} préparée${newOrders.length > 1 ? "s" : ""} depuis les prévisions : ${names}`);
    pushToast(`${newOrders.length} commande${newOrders.length > 1 ? "s" : ""} en attente — à valider dans Fournisseurs`, "ok");
  };
  // Lots datés : ajout d'un lot (avec ou sans arrivage) et actions sur un lot.
  const handleAddLot = ({ productId, qty, expiry, addToStock }) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    const now = new Date().toISOString();
    const lot = { id: uid(), qty, expiry, addedAt: now, by: actorName() };
    const nextStock = addToStock ? (Number(p.stock) || 0) + qty : p.stock;
    saveProducts(products.map((x) => (x.id === productId ? { ...x, stock: nextStock, lots: [...(x.lots || []), lot] } : x)));
    if (addToStock) saveMovements([{ id: uid(), date: now, productId, productName: p.name, type: "livraison", delta: qty, before: p.stock, after: nextStock, author: actorName(), note: `Lot périmant le ${new Date(`${expiry}T12:00:00`).toLocaleDateString("fr-FR")}` }, ...movements]);
    logAudit("stock", `Lot daté ajouté · ${p.name} : ${qty} (expire le ${new Date(`${expiry}T12:00:00`).toLocaleDateString("fr-FR")})`, { productId });
    pushToast("Lot enregistré", "ok");
  };
  const handleLotAction = (productId, lotId, action, remaining = 0) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    if (action === "feature") {
      if (!p.favorite) { saveProducts(products.map((x) => (x.id === productId ? { ...x, favorite: true } : x))); pushToast(`${p.name} ajouté aux touches rapides`, "ok"); }
      return;
    }
    const now = new Date().toISOString();
    const lot = (p.lots || []).find((l) => l.id === lotId);
    const qty = Math.min(Math.max(0, Number(remaining) || 0), Math.max(0, Number(p.stock) || 0));
    const after = (Number(p.stock) || 0) - qty;
    const label = action === "loss" ? "Périmé — perte déclarée" : "Retiré de la vente";
    saveProducts(products.map((x) => (x.id === productId ? { ...x, stock: after, lots: (x.lots || []).map((l) => (l.id === lotId ? { ...l, cleared: true, clearedAt: now, clearedBy: actorName(), clearedReason: label } : l)) } : x)));
    if (qty > 0) saveMovements([{ id: uid(), date: now, productId, productName: p.name, type: "ajustement", delta: -qty, before: p.stock, after, author: actorName(), note: `${label}${lot?.expiry ? ` (lot expirant le ${new Date(`${lot.expiry}T12:00:00`).toLocaleDateString("fr-FR")})` : ""}` }, ...movements]);
    pushToast(action === "loss" ? "Perte déclarée, stock mis à jour" : "Lot retiré du stock", "ok");
  };

  // Alerte péremption : une fois par jour et par entreprise, dès qu'un lot
  // est périmé ou expire dans les 3 jours.
  useEffect(() => {
    if (!role || !activeShopId || !Array.isArray(products) || !products.length) return;
    const key = `expiryAlert:${activeShopId}:${new Date().toDateString()}`;
    try { if (localStorage.getItem(key)) return; } catch { /* ignore */ }
    const urgent = expiringLots(products).filter((x) => x.days <= 3);
    if (!urgent.length) return;
    try { localStorage.setItem(key, "1"); } catch { /* ignore */ }
    pushNotification({ type: "expiry_alert", count: urgent.length, expired: urgent.filter((x) => x.days < 0).length, first: urgent[0].product.name });
  }, [role, activeShopId, products]);

  const lowStockCount = products ? products.filter((p) => p.stock <= p.minStock).length : 0;
  const creditCount = sales ? sales.filter((s) => s.paymentMethod === "credit" && !s.paid).length : 0;

  if (!dataReady) {
    return (
      <div className="gb-root min-h-screen flex items-center justify-center">
        <GlobalStyle />
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--glass)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const activeTheme = getTheme(shop?.theme || "emeraude");
  const isDark = !!shop?.darkMode;
  const themeVars = { "--glass": activeTheme.glass, "--glass-light": activeTheme.glassLight, "--cap": activeTheme.cap };
  const tr = (key) => (TRANSLATIONS[shop?.language || "fr"] && TRANSLATIONS[shop?.language || "fr"][key]) || TRANSLATIONS.fr[key] || key;

  return (
    <div className={`gb-root min-h-screen flex justify-center${isDark ? " gb-dark" : ""}`} style={themeVars}>
      <GlobalStyle />
      <div className="w-full max-w-[430px] sm:max-w-[600px] lg:max-w-[880px] xl:max-w-[1100px] min-h-screen relative" style={{ background: "var(--paper)", paddingTop: "max(22px, env(safe-area-inset-top))" }}>
        {role === "admin" && view === "admin" && !ownerAccess && <SupportChatWidget shop={shop} />}
        {homeScreenActive ? (
          <OnboardingScreen
            shops={shops}
            onComplete={handleOnboardingComplete}
            onJoinShop={handleJoinShopComplete}
            pushToast={pushToast}
            hasSavedShop={shops.length > 0}
            savedShopName={shop?.name || shops[0]?.name}
            onResume={() => setHomeScreenActive(false)}
            onCancel={() => setHomeScreenActive(false)}
            trialUsed={trialUsed}
            onStartTrial={handleStartTrial}
          />
        ) : shops.length === 0 ? (
          <OnboardingScreen shops={shops} onComplete={handleOnboardingComplete} onJoinShop={handleJoinShopComplete} pushToast={pushToast} trialUsed={trialUsed} onStartTrial={handleStartTrial} />
        ) : shop && (
          <CurrencyContext.Provider value={shop.currency}>
          <LanguageContext.Provider value={shop.language || "fr"}>
            {!role ? (
              <LoginScreen shop={shop} shops={shops} activeShopId={activeShopId} onSwitchShop={handleSwitchShop} vendors={vendors} onLogin={(r, name) => { clearLock(); logAudit("connexion", `Connexion de ${name}`, { by: name, role: r }); setRole(r); setCurrentVendorName(name); setView("sell"); window.storage.set("sessionRole", JSON.stringify(r)).catch(() => {}); window.storage.set("sessionVendorName", JSON.stringify(name)).catch(() => {}); }} pushToast={pushToast} onGoHome={() => setHomeScreenActive(true)} />
            ) : (
              <>
                <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] sm:max-w-[600px] lg:max-w-[880px] xl:max-w-[1100px] px-4 pb-2 flex items-center justify-between z-20 no-print" style={{ background: "var(--paper)", boxShadow: "0 4px 10px -6px rgba(0,0,0,0.18)", paddingTop: "max(22px, env(safe-area-inset-top))" }}>
                  <div>
                    <p className="font-display font-bold text-base leading-none">{shop.name}</p>
                    <p className="text-[11px] opacity-50 mt-0.5 flex items-center gap-1.5">
                      {currentVendorName}
                      {shop.backendLinked && pendingSync > 0 && (
                        <button onClick={() => trySync(true)} className="gb-focus inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "#E8720C", color: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }} title="Appuyer pour forcer la synchronisation">
                          ⏳ {pendingSync}
                        </button>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setGlobalSearchOpen(true)} className="gb-focus w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--paper-dim)" }} aria-label="Recherche globale">
                      <Search size={15} />
                    </button>
                    {role && (
                      <div className="relative">
                        <button
                          onClick={() => { setNotifPanelOpen((v) => !v); if (!notifPanelOpen) setUnreadCount(0); }}
                          className="gb-focus w-9 h-9 rounded-full flex items-center justify-center relative"
                          style={{ background: "var(--paper-dim)" }}
                        >
                          <Bell size={15} />
                          {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-[3px] rounded-full text-[9px] font-bold flex items-center justify-center text-white" style={{ background: "var(--danger)" }}>{unreadCount}</span>
                          )}
                        </button>
                        {notifPanelOpen && (
                          <>
                            <div className="fixed inset-0 z-[95]" onClick={() => setNotifPanelOpen(false)} />
                            <div className="fixed z-[96] rounded-2xl overflow-hidden gb-slide-up flex flex-col" style={{ right: "max(12px, env(safe-area-inset-right))", top: "calc(max(22px, env(safe-area-inset-top)) + 52px)", width: "min(22rem, calc(100vw - 24px))", maxHeight: "calc(100vh - max(22px, env(safe-area-inset-top)) - 160px - env(safe-area-inset-bottom))", background: "var(--card)", boxShadow: "0 16px 40px -12px rgba(15,27,22,0.32)", border: "1px solid var(--line)" }}>
                              <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--line)" }}>
                                <span className="text-sm font-semibold">Notifications</span>
                                {notifications.length > 0 && (
                                  <button onClick={() => setNotifications([])} className="gb-focus text-[11px] opacity-50 underline">Effacer</button>
                                )}
                              </div>
                              <div className="overflow-y-auto gb-scroll" style={{ flex: "1 1 auto", minHeight: 0 }}>
                                <VoiceSettingsCard prefs={voicePrefs} onChange={saveVoicePrefs} expanded={voiceSettingsOpen} onToggleExpanded={() => setVoiceSettingsOpen((v) => !v)} />
                                {notifications.length === 0 && <p className="text-xs opacity-50 text-center py-8 px-4">Aucune notification récente.</p>}
                                {notifications.map((n) => (
                                  <div key={n.id} className="px-4 py-3 border-b last:border-0 flex items-start gap-2.5" style={{ borderColor: "var(--line)" }}>
                                    {(!n.type || n.type === "sale") && (
                                      <>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#E7F7EE" }}><ShoppingCart size={12} color="#1CA857" /></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium leading-snug">{formatMoney(n.total, shop.currency)} vendu par {n.vendor}</p>
                                          <p className="text-[10px] opacity-45 mt-0.5">{new Date(n.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                                        </div>
                                      </>
                                    )}
                                    {n.type === "trial" && (
                                      <>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#FFF3E0" }}><Gift size={12} color="var(--cap)" /></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium leading-snug">Essai gratuit — {n.daysLeft} jour{n.daysLeft > 1 ? "s" : ""} restant{n.daysLeft > 1 ? "s" : ""}. Pense à activer une licence pour continuer sans interruption.</p>
                                        </div>
                                      </>
                                    )}
                                    {n.type === "lowstock" && (
                                      <>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#FCEBE8" }}><AlertTriangle size={12} color="var(--danger)" /></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium leading-snug">{n.count} produit{n.count > 1 ? "s" : ""} en stock bas : {n.names.join(", ")}{n.count > n.names.length ? "…" : ""}</p>
                                        </div>
                                      </>
                                    )}
                                    {n.type === "stock_alert" && (() => {
                                      const meta = {
                                        5: { bg: "#FAEEDA", color: "#854F0B", Icon: AlertTriangle, text: `Stock bas : ${n.productName} — il reste ${n.stock} ${n.unit}${n.stock > 1 ? "s" : ""}.` },
                                        4: { bg: "#FAEEDA", color: "#854F0B", Icon: AlertTriangle, text: `Stock bas : ${n.productName} — il reste ${n.stock} ${n.unit}${n.stock > 1 ? "s" : ""}. Pense à réapprovisionner.` },
                                        2: { bg: "#FCEBEB", color: "#A32D2D", Icon: AlertTriangle, text: `Stock critique : ${n.productName} — il ne reste que ${n.stock} ${n.unit}${n.stock > 1 ? "s" : ""} !` },
                                        1: { bg: "#FCEBEB", color: "#A32D2D", Icon: AlertTriangle, text: `Stock critique : ${n.productName} — il ne reste plus qu'${n.stock} ${n.unit} ! Recharge le stock.` },
                                        0: { bg: "#2C2C2A", color: "#fff", Icon: X, text: `Rupture de stock : ${n.productName} n'est plus en stock.` },
                                      }[n.level] || {};
                                      return (
                                        <>
                                          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: meta.bg }}><meta.Icon size={12} color={meta.color} /></div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium leading-snug">{meta.text}</p>
                                          </div>
                                        </>
                                      );
                                    })()}
                                    {n.type === "sale_edited" && (
                                      <>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#FFF3E0" }}><Pencil size={12} color="var(--cap)" /></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium leading-snug">Vente N° {n.receiptNumber} modifiée — nouveau total {formatMoney(n.total, shop.currency)}</p>
                                          <p className="text-[10px] opacity-45 mt-0.5">{new Date(n.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                                        </div>
                                      </>
                                    )}
                                    {n.type === "expiry_alert" && (
                                      <>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#FBE4E1" }}><CalendarCheck size={12} color="#B3261E" /></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium leading-snug">Péremption : {n.count} lot{n.count > 1 ? "s" : ""} {n.expired ? `(dont ${n.expired} périmé${n.expired > 1 ? "s" : ""})` : "expire(nt) sous 3 jours"} — {n.first}{n.count > 1 ? "…" : ""}. Voir Stock › Péremption.</p>
                                          <p className="text-[10px] opacity-45 mt-0.5">{new Date(n.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                                        </div>
                                      </>
                                    )}
                                    {n.type === "sale_returned" && (
                                      <>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#E1F5EE" }}><Undo2 size={12} color="#0F6E56" /></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium leading-snug">Retour sur la vente N° {n.receiptNumber} — {n.itemCount} article{n.itemCount > 1 ? "s" : ""} ({formatMoney(n.amount, shop.currency)}){n.refund > 0 ? ` · remboursé ${formatMoney(n.refund, shop.currency)} en ${REFUND_LABELS[n.refundMode] || ""}` : " · déduit du crédit"}{n.by ? ` · ${n.by}` : ""}</p>
                                          <p className="text-[10px] opacity-45 mt-0.5">{new Date(n.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                                        </div>
                                      </>
                                    )}
                                    {n.type === "sale_deleted" && (
                                      <>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#FCEBE8" }}><Trash2 size={12} color="var(--danger)" /></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium leading-snug">Vente N° {n.receiptNumber} supprimée ({formatMoney(n.total, shop.currency)})</p>
                                          <p className="text-[10px] opacity-45 mt-0.5">{new Date(n.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                                        </div>
                                      </>
                                    )}
                                    {n.type === "expense" && (
                                      <>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#FAEEDA" }}><Wallet size={12} color="#854F0B" /></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium leading-snug">Dépense ajoutée — {n.label} ({formatMoney(n.amount, shop.currency)}){n.author ? ` · ${n.author}` : ""}</p>
                                          <p className="text-[10px] opacity-45 mt-0.5">{new Date(n.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                                        </div>
                                      </>
                                    )}
                                    {n.type === "credit_settled" && (
                                      <>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#E7F7EE" }}><CreditCard size={12} color="#1CA857" /></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium leading-snug">Crédit encaissé{n.clientName ? ` — ${n.clientName}` : ""} ({formatMoney(n.total, shop.currency)}) · {n.by}</p>
                                          <p className="text-[10px] opacity-45 mt-0.5">{new Date(n.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                                        </div>
                                      </>
                                    )}
                                    {n.type === "avoir_created" && (
                                      <>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: n.avoirType === "produit" ? "#EEEDFE" : "#FAEEDA" }}>
                                          {n.avoirType === "produit" ? <PackageX size={12} color="#534AB7" /> : <Coins size={12} color="#854F0B" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium leading-snug">
                                            {n.avoirType === "produit"
                                              ? `Avoir produit — ${n.clientName} (${n.itemCount} article${n.itemCount > 1 ? "s" : ""})`
                                              : `Avoir monnaie — ${n.clientName} (${formatMoney(n.amount, shop.currency)})`}
                                          </p>
                                          <p className="text-[10px] opacity-45 mt-0.5">{new Date(n.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                                        </div>
                                      </>
                                    )}
                                    {n.type === "order_validated" && (
                                      <>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#E6F1FB" }}><Truck size={12} color="#185FA5" /></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium leading-snug">Commande validée — {n.supplierName} ({n.itemCount} produit{n.itemCount > 1 ? "s" : ""}, {formatMoney(n.total, shop.currency)})</p>
                                          <p className="text-[10px] opacity-45 mt-0.5">{new Date(n.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                                        </div>
                                      </>
                                    )}
                                    {n.type === "vendor_blocked" && (
                                      <>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#FCEBE8" }}><Lock size={12} color="var(--danger)" /></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium leading-snug">Vendeur bloqué — {n.vendorName}</p>
                                          <p className="text-[10px] opacity-45 mt-0.5">{new Date(n.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                                        </div>
                                      </>
                                    )}
                                    {n.type === "vendor_unblocked" && (
                                      <>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#E7F7EE" }}><Unlock size={12} color="#1CA857" /></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium leading-snug">Vendeur débloqué — {n.vendorName}</p>
                                          <p className="text-[10px] opacity-45 mt-0.5">{new Date(n.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                                        </div>
                                      </>
                                    )}
                                    {n.type === "stock_movement" && (
                                      <>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#FAEEDA" }}><Boxes size={12} color="#854F0B" /></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium leading-snug">Comptage validé — {n.count} écart{n.count > 1 ? "s" : ""} ajusté{n.count > 1 ? "s" : ""}</p>
                                          <p className="text-[10px] opacity-45 mt-0.5">{new Date(n.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                                        </div>
                                      </>
                                    )}
                                    {n.type === "product_created" && (
                                      <>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#E1F5EE" }}><PackagePlus size={12} color="#0F6E56" /></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium leading-snug">Produit créé — {n.productName}</p>
                                          <p className="text-[10px] opacity-45 mt-0.5">{new Date(n.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                                        </div>
                                      </>
                                    )}
                                    {n.type === "product_updated" && (
                                      <>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#E6F1FB" }}><Pencil size={12} color="#185FA5" /></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium leading-snug">Produit mis à jour — {n.productName}{n.delta ? ` (stock ${n.delta > 0 ? "+" : ""}${n.delta})` : ""}</p>
                                          <p className="text-[10px] opacity-45 mt-0.5">{new Date(n.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                                        </div>
                                      </>
                                    )}
                                    {n.type === "product_deleted" && (
                                      <>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#FCEBEB" }}><Trash2 size={12} color="var(--danger)" /></div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium leading-snug">Produit supprimé — {n.productName}</p>
                                          <p className="text-[10px] opacity-45 mt-0.5">{new Date(n.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    <button onClick={() => { logAudit("connexion", `Déconnexion de ${actorName() || "l'utilisateur"}`); clearLock(); setRole(null); setCurrentVendorName(""); setCart([]); setNotifications([]); setUnreadCount(0); setNotifPanelOpen(false); window.storage.delete("sessionRole").catch(() => {}); window.storage.delete("sessionVendorName").catch(() => {}); setHomeScreenActive(true); }} className="gb-focus w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--paper-dim)" }}><LogOut size={15} /></button>
                  </div>
                </div>
                <div aria-hidden="true" style={{ height: "calc(7px + max(22px, env(safe-area-inset-top)))" }} />

                {globalSearchOpen && (
                  <GlobalSearchModal products={products} clients={clients} categories={categories} sales={sales} avoirs={avoirs} expenses={expenses} role={role} view={view} adminSection={activeAdminSection} onClose={() => setGlobalSearchOpen(false)} />
                )}

                {licenseStatus === "expired" ? (
                  <LicenseLockedScreen
                    role={role}
                    shopName={shop?.name}
                    onActivate={handleActivateLicense}
                    pushToast={pushToast}
                    onLogout={() => { logAudit("connexion", `Déconnexion de ${actorName() || "l'utilisateur"}`); clearLock(); setRole(null); setCurrentVendorName(""); setCart([]); setNotifications([]); setUnreadCount(0); setNotifPanelOpen(false); window.storage.delete("sessionRole").catch(() => {}); window.storage.delete("sessionVendorName").catch(() => {}); setHomeScreenActive(true); }}
                  />
                ) : (
                  <>
                    {view === "sell" && (
                      <SellScreen shop={shop} categories={categories} products={products} sales={sales} clients={clients} onCreateClient={onCreateClient} cart={cart} setCart={setCart} onCheckout={handleCheckout} onCreateMoneyAvoir={handleCreateMoneyAvoir} onCreateProductAvoir={handleCreateProductAvoir} onCreateProductAndMoneyAvoir={handleCreateProductAndMoneyAvoir} pushToast={pushToast} hasCashToday={!!todayCashEntry} onRequireCash={() => { pushToast("Renseignez le montant de la caisse avant de commencer les ventes du jour", "error"); setCashRegisterModalOpen(true); }} />
                    )}
                    {view === "stock" && <StockScreen products={products} categories={categories} sales={sales || []} movements={movements || []} inventories={inventories || []} suppliers={suppliers || []} supplierProducts={supplierProducts || []} isAdmin={role === "admin"} onCreateOrders={handleCreateForecastOrders} onLotAction={handleLotAction} onAddLot={handleAddLot} shop={shop} />}
                    {view === "credits" && <PositionScreen shop={shop} sales={sales} avoirs={avoirs} clients={clients} onSettleCredit={handleSettleCredit} onRedeemMoney={handleRedeemMoneyAvoir} onRedeemProduct={handleRedeemProductAvoir} onReturnSale={handleReturnSale} pushToast={pushToast} />}
                    {view === "history" && <HistoryScreen shop={shop} sales={sales} products={products} clients={clients} vendorFilter={role === "admin" ? null : currentVendorName} isAdmin={role === "admin"} onDeleteSale={(id) => requireAdmin("Supprimer une vente", () => handleDeleteSale(id))} onUpdateSale={(id, items, method) => requireAdmin("Modifier une vente", () => handleUpdateSale(id, items, method))} onReturnSale={handleReturnSale} onSaveInvoice={handleSaveInvoice} pushToast={pushToast} />}
                    {view === "expenses" && role === "vendeur" && (
                      <VendorExpensesScreen expenses={expenses} saveExpenses={saveExpenses} suppliers={suppliers} vendorName={currentVendorName} />
                    )}
                    {view === "admin" && role === "admin" && (
                      <AdminScreen
                        cashRegisterEntries={cashRegisterEntries} versements={versements} activeCashSession={activeCashSession} onRecordVersement={recordVersement}
                        shop={shop} saveShopMeta={saveShopMeta} shops={shops} activeShopId={activeShopId}
                        onSwitchShop={handleSwitchShop} onCreateShop={handleCreateShop} onDeleteShop={handleDeleteShop}
                        products={products} saveProducts={saveProducts} categories={categories} saveCategories={saveCategories} movements={movements} saveMovements={saveMovements} inventories={inventories} saveInventories={saveInventories} sales={sales} saveSales={saveSales}
                        suppliers={suppliers} saveSuppliers={saveSuppliers} expenses={expenses} saveExpenses={saveExpenses}
                        vendors={vendors} saveVendors={saveVendors} clients={clients} saveClients={saveClients} license={license} licenseStatus={licenseStatus} onActivateLicense={handleActivateLicense} onRestoreBackup={handleRestoreBackup} ownerAccess={ownerAccess} onVerifyOwner={handleVerifyOwner} pushToast={pushToast}
                        orders={orders} saveOrders={saveOrders} supplierProducts={supplierProducts} saveSupplierProducts={saveSupplierProducts}
                        avoirs={avoirs}
                        menuOpen={adminMenuOpen} setMenuOpen={setAdminMenuOpen} pushNotification={pushNotification} onSectionChange={setActiveAdminSection}
                        auditLog={auditLog} requireAdmin={requireAdmin} onRestoreServerBackup={handleRestoreServerBackup}
                      />
                    )}
                  </>
                )}

                {role && locked && (
                  <LockScreen
                    userName={actorName()}
                    onUnlock={handleUnlock}
                    onSwitchUser={() => { logAudit("connexion", `Changement d'utilisateur depuis l'écran verrouillé (${actorName()})`); clearLock(); setRole(null); setCurrentVendorName(""); setCart([]); setNotifications([]); setUnreadCount(0); setNotifPanelOpen(false); window.storage.delete("sessionRole").catch(() => {}); window.storage.delete("sessionVendorName").catch(() => {}); }}
                  />
                )}
                {adminGuard && <AdminCodeModal label={adminGuard.label} onSubmit={handleAdminGuard} onCancel={() => { setAdminGuard(null); pushToast("Action annulée", "error"); }} />}
                {licenseStatus !== "expired" && (
                <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] sm:max-w-[600px] lg:max-w-[880px] xl:max-w-[1100px] px-3 pt-2 z-30 no-print" style={{ background: "linear-gradient(to top, var(--paper) 60%, transparent)", paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
                  <div className="rounded-2xl flex items-stretch shadow-lg overflow-hidden" style={{ background: "var(--glass)" }}>
                    {TABS[role].map((t) => (
                      <button key={t.id} onClick={() => { setView(t.id); if (t.id === "admin") setAdminMenuOpen(true); }} className="gb-focus flex-1 flex flex-col items-center gap-1 py-2.5" style={{ background: view === t.id ? "var(--glass-light)" : "transparent" }}>
                        <div className="relative">
                          <t.Icon size={17} color={view === t.id ? "var(--cap)" : "#ffffff90"} />
                          {t.id === "stock" && lowStockCount > 0 && (
                            <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-[3px] rounded-full text-[8px] font-bold flex items-center justify-center text-white" style={{ background: "var(--danger)" }}>{lowStockCount}</span>
                          )}
                          {t.id === "credits" && creditCount > 0 && (
                            <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-[3px] rounded-full text-[8px] font-bold flex items-center justify-center text-white" style={{ background: "var(--danger)" }}>{creditCount}</span>
                          )}
                        </div>
                        <span className="text-[10px] font-medium" style={{ color: view === t.id ? "#fff" : "#ffffff70" }}>
                          {t.id === "credits" ? (
                            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15, fontSize: 9, textAlign: "center" }}>
                              <span>{tr("creditWord")}</span>
                              <span>{tr("avoirWord")}</span>
                            </span>
                          ) : tr(t.id)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                )}
              </>
            )}
          </LanguageContext.Provider>
          </CurrencyContext.Provider>
        )}

        <Toast toast={toast} />
        <SaleToastStack toasts={saleToasts} />
        {cashRegisterModalOpen && role && <CashRegisterModal afterVersement={cashModalAfterVersement} onSave={recordCashRegister} onClose={() => { setCashRegisterModalOpen(false); setCashModalAfterVersement(false); }} />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
