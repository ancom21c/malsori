{{- define "malsori.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "malsori.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name (include "malsori.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "malsori.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" -}}
{{- end -}}

{{- define "malsori.labels" -}}
app.kubernetes.io/name: {{ include "malsori.name" . }}
helm.sh/chart: {{ include "malsori.chart" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "malsori.selectorLabels" -}}
app.kubernetes.io/name: {{ include "malsori.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "malsori.pythonSecretName" -}}
{{- printf "%s-python-secret" (include "malsori.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "malsori.webappConfigName" -}}
{{- printf "%s-webapp-config" (include "malsori.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
