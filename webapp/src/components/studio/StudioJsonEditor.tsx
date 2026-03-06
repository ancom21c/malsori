import {
  Box,
  Card,
  CardHeader,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from "@mui/material";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import { useI18n } from "../../i18n";

type StudioJsonEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onFormat?: () => void;
  onCopy?: () => void;
  label?: string;
  error?: boolean;
  helperText?: string;
  minRows?: number;
};

export function StudioJsonEditor({
  value,
  onChange,
  onFormat,
  onCopy,
  label,
  error,
  helperText,
  minRows = 10,
}: StudioJsonEditorProps) {
  const { t } = useI18n();

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: error ? "error.main" : "divider",
        backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.3),
      }}
    >
      <CardHeader
        title={
          label && (
            <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
              {label}
            </Typography>
          )
        }
        sx={{
          py: 1,
          px: 2,
          backgroundColor: (theme) => alpha(theme.palette.background.default, 0.5),
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
        action={
          <Stack direction="row" spacing={0.5}>
            {onFormat && (
              <Tooltip title={t("formatJson")}>
                <IconButton
                  size="small"
                  onClick={onFormat}
                  color="primary"
                  aria-label={t("formatJson")}
                >
                  <AutoFixHighIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {onCopy && (
              <Tooltip title={t("copyJson")}>
                <IconButton size="small" onClick={onCopy} aria-label={t("copyJson")}>
                  <ContentCopyOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        }
      />
      <Box sx={{ p: 1 }}>
        <TextField
          multiline
          fullWidth
          minRows={minRows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          error={error}
          helperText={helperText}
          variant="standard"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          InputProps={{
            disableUnderline: true,
            sx: {
              fontFamily: '"Roboto Mono", "IBM Plex Mono", monospace',
              fontSize: "0.875rem",
              lineHeight: 1.5,
              padding: 1.5,
              color: error ? "error.light" : "primary.light",
              "& textarea": {
                overflowY: "auto",
                scrollbarWidth: "thin",
                "&::-webkit-scrollbar": {
                  width: "6px",
                },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: "rgba(255,255,255,0.1)",
                  borderRadius: "3px",
                },
              },
            },
          }}
        />
      </Box>
    </Card>
  );
}
