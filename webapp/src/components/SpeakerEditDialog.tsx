import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import type { ChangeEvent } from "react";

interface SpeakerEditDialogProps {
  open: boolean;
  name: string;
  labels: {
    title: string;
    nameLabel: string;
    updateAll: string;
    createNew: string;
    cancel: string;
  };
  onChangeName: (value: string) => void;
  onUpdateAll: () => void;
  onUpdateSingle: () => void;
  onClose: () => void;
}

export function SpeakerEditDialog({
  open,
  name,
  labels,
  onChangeName,
  onUpdateAll,
  onUpdateSingle,
  onClose,
}: SpeakerEditDialogProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChangeName(event.target.value);
  };

  const handleEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onUpdateAll();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{labels.title}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <TextField
            label={labels.nameLabel}
            value={name}
            onChange={handleChange}
            fullWidth
            autoFocus
            onKeyDown={handleEnter}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ flexDirection: "column", gap: 1, alignItems: "stretch", p: 2 }}>
        <Button variant="contained" onClick={onUpdateAll} fullWidth>
          {labels.updateAll}
        </Button>
        <Button variant="outlined" onClick={onUpdateSingle} fullWidth>
          {labels.createNew}
        </Button>
        <Button onClick={onClose} fullWidth color="inherit">
          {labels.cancel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
