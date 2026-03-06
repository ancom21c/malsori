import {
    Box,
    Card,
    CardContent,
    Chip,
    Divider,
    FormControlLabel,
    Stack,
    Switch,
    TextField,
    Typography,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "../../i18n";
import { useRef, useEffect } from "react";

interface RealtimeSegment {
    id: string;
    text: string;
    startMs: number;
    endMs: number;
}

interface RealtimeTranscriptProps {
    segments: RealtimeSegment[];
    partialText: string | null;
    noteMode: boolean;
    onNoteModeChange: (enabled: boolean) => void;
    noteModeText: string;
    sessionState: string;
}

export default function RealtimeTranscript({
    segments,
    partialText,
    noteMode,
    onNoteModeChange,
    noteModeText,
    sessionState,
}: RealtimeTranscriptProps) {
    const { t } = useI18n();
    const transcriptEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (segments.length === 0 && !partialText) {
            return;
        }
        transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [segments, partialText]);

    const formatTimeRange = (segment: RealtimeSegment) => {
        const start = (segment.startMs / 1000).toFixed(1);
        const end = (segment.endMs / 1000).toFixed(1);
        return `${start}s ~ ${end}s`;
    };

    const isEmpty = segments.length === 0 && !partialText && sessionState === "idle";

    return (
        <Card sx={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
            <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <Stack spacing={2} sx={{ flex: 1 }}>
                    <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                    >
                        <Stack spacing={0.5}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={noteMode}
                                        onChange={(event) => onNoteModeChange(event.target.checked)}
                                    />
                                }
                                label={t("noteMode")}
                            />
                            <Typography variant="caption" color="text.secondary">
                                {t("noteModeHelper")}
                            </Typography>
                        </Stack>
                    </Stack>

                    <Divider />

                    {noteMode ? (
                        <TextField
                            multiline
                            minRows={10}
                            fullWidth
                            variant="outlined"
                            label={t("noteModeTextAreaLabel")}
                            placeholder={t("noteModePlaceholder")}
                            value={noteModeText}
                            InputProps={{
                                readOnly: true,
                                sx: {
                                    fontFamily: '"IBM Plex Sans KR", sans-serif',
                                    lineHeight: 1.6,
                                }
                            }}
                        />
                    ) : (
                        <Box sx={{ flex: 1 }}>
                            {isEmpty ? (
                                <Box sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
                                    <Typography variant="body1">
                                        {t("whenYouStartASessionRecognizedSentencesWillAppearInThisAreaInOrder")}
                                    </Typography>
                                </Box>
                            ) : (
                                <Stack spacing={2}>
                                    <AnimatePresence mode="popLayout">
                                        {segments.map((segment) => (
                                            <motion.div
                                                key={segment.id}
                                                layout
                                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                transition={{
                                                    type: "spring",
                                                    stiffness: 400,
                                                    damping: 30,
                                                    mass: 0.8,
                                                }}
                                            >
                                                <Card
                                                    variant="outlined"
                                                    sx={{
                                                        borderRadius: 3,
                                                        bgcolor: "background.paper",
                                                        "&:hover": { borderColor: "primary.main" }
                                                    }}
                                                >
                                                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                                                        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                                            <Chip
                                                                label={formatTimeRange(segment)}
                                                                color="success"
                                                                size="small"
                                                                variant="outlined"
                                                                sx={{ fontWeight: 600, fontSize: "0.7rem" }}
                                                            />
                                                        </Stack>
                                                        <Typography variant="body1" sx={{ lineHeight: 1.5 }}>
                                                            {segment.text}
                                                        </Typography>
                                                    </CardContent>
                                                </Card>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>

                                    {partialText && (
                                        <AnimatePresence>
                                            <motion.div
                                                layout
                                                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                            >
                                                <Card
                                                    variant="outlined"
                                                    sx={{
                                                        borderColor: "secondary.main",
                                                        bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.05),
                                                        borderRadius: 3,
                                                    }}
                                                >
                                                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                                                        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                                            <Chip
                                                                label={t("realTimeRecognition")}
                                                                color="secondary"
                                                                size="small"
                                                                sx={{ fontWeight: 600, fontSize: "0.7rem" }}
                                                            />
                                                        </Stack>
                                                        <Typography variant="body1" color="secondary.main" sx={{ lineHeight: 1.5 }}>
                                                            {partialText}
                                                        </Typography>
                                                    </CardContent>
                                                </Card>
                                            </motion.div>
                                        </AnimatePresence>
                                    )}
                                </Stack>
                            )}
                        </Box>
                    )}
                    <Box ref={transcriptEndRef} sx={{ height: 1 }} />
                </Stack>
            </CardContent>
        </Card>
    );
}

import { alpha } from "@mui/material/styles";
