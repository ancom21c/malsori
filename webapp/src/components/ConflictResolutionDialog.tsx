import React from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    Typography,
    Box,
    Alert,
} from "@mui/material";
import { useI18n } from "../i18n";

export interface ConflictResolutionDialogProps {
    open: boolean;
    onMerge: () => void;
    onReplace: () => void;
    onCancel: () => void;
}

export const ConflictResolutionDialog: React.FC<ConflictResolutionDialogProps> = ({
    open,
    onMerge,
    onReplace,
    onCancel,
}) => {
    const { t } = useI18n();

    return (
        <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
            <DialogTitle>{t("googleDriveAccountConflictDetected")}</DialogTitle>
            <DialogContent>
                <DialogContentText paragraph>
                    {t("googleDriveAccountConflictDetectedDescription")}
                </DialogContentText>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
                    <Box>
                        <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            onClick={onMerge}
                            sx={{ mb: 1 }}
                        >
                            {t("googleDriveConflictMergeButtonLabel")}
                        </Button>
                        <Typography variant="caption" color="text.secondary">
                            {t("googleDriveConflictMergeHelper")}
                        </Typography>
                    </Box>

                    <Box>
                        <Button
                            variant="contained"
                            color="error"
                            fullWidth
                            onClick={onReplace}
                            sx={{ mb: 1 }}
                        >
                            {t("googleDriveConflictReplaceButtonLabel")}
                        </Button>
                        <Alert severity="warning" sx={{ mt: 1 }}>
                            <Typography variant="caption">
                                {t("googleDriveConflictReplaceWarning")}
                            </Typography>
                        </Alert>
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel} color="inherit">
                    {t("cancellation")}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
