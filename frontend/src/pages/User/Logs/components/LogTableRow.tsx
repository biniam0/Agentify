import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown, ChevronUp, CheckCircle2, MessageSquare, AlertCircle, ArrowDownCircle, ArrowUpCircle, RotateCcw, Calendar, Briefcase, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { CallTimeline } from './CallTimeline';

// --- Log Row ---
export interface LogItem {
    id: string;
    activityType: string; // e.g., 'pre-meeting'
    dealName: string;
    dealId: string;
    companyName: string;
    ownerName: string;
    ownerAvatar?: string;
    date: string;
    status: string; // 'New', 'Waiting', 'Complete'
    description?: string;

    // Tier 1: Timeline data
    initiatedAt: string;
    answeredAt?: string;
    completedAt?: string;
    duration?: number;

    // Tier 1: Retry info
    retryAttempt: number;
    maxRetries: number;
    parentCallId?: string;

    // Tier 1: Meeting/Deal context
    meetingId: string;
    meetingTitle: string;

    // Tier 1: Call direction
    callDirection: 'INBOUND' | 'OUTBOUND';

    details?: {
        action: string;
        contact: string;
        role: string;
        companyName?: string;
    }[];
}

interface LogTableRowProps {
    item: LogItem;
    onToggle: (id: string) => void;
    isExpanded: boolean;
}

export const LogTableRow: React.FC<LogTableRowProps> = ({ item, onToggle, isExpanded }) => {
    const getStatusBadge = (status: string) => {
        switch (status.toLowerCase()) {
            case 'new':
            case 'completed':
                return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 font-normal">New</Badge>; // Matching screenshot 'New' is green
            case 'waiting':
            case 'failed':
                return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 font-normal">Waiting</Badge>;
            default:
                return <Badge variant="outline" className="text-slate-600 font-normal">{status}</Badge>;
        }
    };

    const getActivityBadge = (type: string) => {
        return (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-slate-200 bg-white text-xs font-medium text-slate-700">
                <span className={`w-1.5 h-1.5 rounded-full ${type.includes('pre') ? 'bg-orange-400' : 'bg-red-500'}`} />
                {type}
            </div>
        );
    };

    const getDirectionBadge = (direction: 'INBOUND' | 'OUTBOUND') => {
        return direction === 'INBOUND' ? (
            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-xs gap-1">
                <ArrowDownCircle className="h-3 w-3" />
                Inbound
            </Badge>
        ) : (
            <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200 text-xs gap-1">
                <ArrowUpCircle className="h-3 w-3" />
                Outbound
            </Badge>
        );
    };

    return (
        <div className="border-b border-slate-100 last:border-0">
            {/* Main Row */}
            <div
                className="grid grid-cols-12 gap-4 py-4 px-6 items-center hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => onToggle(item.id)}
            >
                <div className="col-span-2">
                    <div className="space-y-1">
                        {getActivityBadge(item.activityType)}
                        {getDirectionBadge(item.callDirection)}
                    </div>
                </div>
                <div className="col-span-3">
                    <div className="text-sm font-medium text-slate-900 truncate">{item.dealName}</div>
                </div>
                <div className="col-span-2">
                    <div className="text-sm text-slate-600 truncate">{item.companyName}</div>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={item.ownerAvatar} />
                        <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700">
                            {item.ownerName.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-slate-900 truncate">{item.ownerName}</span>
                </div>
                <div className="col-span-2">
                    <div className="text-sm text-slate-600">
                        {format(new Date(item.date), 'MMM d, yyyy')}
                    </div>
                </div>
                <div className="col-span-1 flex justify-end items-center gap-2">
                    {getStatusBadge(item.status)}
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-6 pb-6 pt-2 bg-slate-50/50">
                    <div className="bg-white border border-slate-100 rounded-lg p-6 space-y-6">

                        {/* Top Action Bar */}
                        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                            <h3 className="text-base font-semibold text-slate-900">Call Details</h3>
                            <div className="flex gap-2">
                                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2" size="sm">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Complete
                                </Button>
                                <Button variant="outline" size="sm" className="gap-2">
                                    <MessageSquare className="h-4 w-4" />
                                    Comment
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Column: Timeline */}
                            <div>
                                <CallTimeline
                                    initiatedAt={item.initiatedAt}
                                    answeredAt={item.answeredAt}
                                    completedAt={item.completedAt}
                                    duration={item.duration}
                                />
                            </div>

                            {/* Right Column: Context & Info */}
                            <div className="space-y-6">
                                {/* Meeting & Deal Context */}
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                        <Briefcase className="h-4 w-4" />
                                        Business Context
                                    </h4>
                                    <div className="space-y-3 bg-slate-50 rounded-lg p-4 border border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-slate-500">Deal</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-slate-900">{item.dealName}</span>
                                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                                                    <LinkIcon className="h-3 w-3 mr-1" />
                                                    View
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-slate-500">Meeting</span>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-3 w-3 text-slate-400" />
                                                <span className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{item.meetingTitle}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Retry Information */}
                                {item.retryAttempt > 1 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                            <RotateCcw className="h-4 w-4" />
                                            Retry Information
                                        </h4>
                                        <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-orange-900">
                                                    Retry Attempt {item.retryAttempt} of {item.maxRetries}
                                                </span>
                                                <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">
                                                    Retry
                                                </Badge>
                                            </div>
                                            {item.parentCallId && (
                                                <p className="text-xs text-orange-600 mt-2">
                                                    Original Call ID: <code className="bg-orange-100 px-1.5 py-0.5 rounded">{item.parentCallId.slice(0, 8)}...</code>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Description */}
                                {item.description && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-700 mb-2">Summary</h4>
                                        <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-4 border border-slate-100">
                                            {item.description}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Failure Details (if any) */}
                        {item.details && item.details.length > 0 && (
                            <div className="pt-4 border-t border-slate-100">
                                <h4 className="text-sm font-semibold text-slate-700 mb-3">Issues Detected</h4>
                                <div className="space-y-3">
                                    {item.details.map((detail, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-md border border-red-100">
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 bg-red-100 rounded text-red-600">
                                                    <AlertCircle className="h-4 w-4" />
                                                </div>
                                                <span className="text-sm font-medium text-slate-700">{detail.action}</span>
                                            </div>
                                            <div className="text-sm text-slate-600">{detail.role}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

