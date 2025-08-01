'use client';
import { motion } from 'framer-motion';
import { Book, Globe, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ProfileCardProps {
    name: string;
    username: string;
    avatarUrl?: string;
    bio?: string;
    stats: {
        entries: number;
        countries: number;
        badges: number;
    };
    className?: string;
}

export function ProfileCard({
    name,
    username,
    avatarUrl,
    bio,
    stats,
    className,
}: ProfileCardProps) {
    return (
        <Card className={cn('overflow-hidden border-gold/20 bg-parchment-light', className)}>
            <div className="h-24 bg-gradient-to-r from-forest to-forest-dark" />
            <div className="relative px-6">
                <Avatar className="absolute -top-12 ring-4 ring-parchment w-24 h-24">
                    <AvatarImage src={avatarUrl || '/placeholder.svg'} alt={name} />
                    <AvatarFallback className="text-2xl font-display bg-gold text-white">
                        {name.charAt(0)}
                    </AvatarFallback>
                </Avatar>
            </div>
            <CardHeader className="pt-14 pb-4">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <h3 className="font-display text-xl font-medium text-deepbrown">{name}</h3>
                    <p className="text-sm text-deepbrown/70">@{username}</p>
                </motion.div>
            </CardHeader>
            <CardContent className="space-y-4">
                {bio && (
                    <motion.p
                        className="text-sm text-deepbrown/80"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        {bio}
                    </motion.p>
                )}

                <motion.div
                    className="grid grid-cols-3 gap-2 pt-2 border-t border-gold/10"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="flex flex-col items-center p-2 rounded-lg bg-parchment">
                        <Book className="h-5 w-5 text-gold mb-1" />
                        <span className="font-display font-medium">{stats.entries}</span>
                        <span className="text-xs text-deepbrown/70">Entries</span>
                    </div>
                    <div className="flex flex-col items-center p-2 rounded-lg bg-parchment">
                        <Globe className="h-5 w-5 text-gold mb-1" />
                        <span className="font-display font-medium">{stats.countries}</span>
                        <span className="text-xs text-deepbrown/70">Countries</span>
                    </div>
                    <div className="flex flex-col items-center p-2 rounded-lg bg-parchment">
                        <Award className="h-5 w-5 text-gold mb-1" />
                        <span className="font-display font-medium">{stats.badges}</span>
                        <span className="text-xs text-deepbrown/70">Badges</span>
                    </div>
                </motion.div>
            </CardContent>
        </Card>
    );
}
