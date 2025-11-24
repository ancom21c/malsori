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
    return (
        <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
            <DialogTitle>Account Conflict Detected</DialogTitle>
            <DialogContent>
                <DialogContentText paragraph>
                    You are connecting a different Google account than the one previously used.
                    How would you like to proceed?
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
                            Merge (Upload Local to New Account)
                        </Button>
                        <Typography variant="caption" color="text.secondary">
                            Keep your current local recordings and upload them to the new account.
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
                            Replace (Wipe Local & Download)
                        </Button>
                        <Alert severity="warning" sx={{ mt: 1 }}>
                            <Typography variant="caption">
                                <strong>Warning:</strong> This will delete all local recordings and download data from the new account.
                            </Typography>
                        </Alert>
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel} color="inherit">
                    Cancel
                </Button>
            </DialogActions>
        </Dialog>
    );
};
