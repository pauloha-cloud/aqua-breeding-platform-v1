# STEMMA - Motor de Modelo Animal (Linear Misto)
# Baseado no Chapter 4 do Mrodes Book
# ---------------------------------------------------------

suppressPackageStartupMessages({
  library(pedigreemm)
  library(tidyverse)
  library(Matrix)
})

# 1. Parsing de Argumentos
args <- commandArgs(trailingOnly = TRUE)
if (length(args) < 3) {
  stop("Uso: Rscript motor_modelo_animal.R <phenotype_csv> <pedigree_csv> <out_dir>")
}

pheno_csv <- args[1]
ped_csv   <- args[2]
out_dir   <- args[3]
dir.create(out_dir, showWarnings = FALSE, recursive = TRUE)

# 2. Leitura e Validação
df_pheno <- read.csv(pheno_csv, stringsAsFactors = FALSE, na.strings = c("", "NA", "NaN"))
df_ped   <- read.csv(ped_csv, stringsAsFactors = FALSE, na.strings = c("", "NA", "NaN"))

# required columns for pheno: a, wwg, sex
# required columns for ped: a, s, d
required_pheno <- c("a", "wwg" , "sex")
missing_pheno  <- setdiff(required_pheno, names(df_pheno))
if (length(missing_pheno) > 0) stop(paste("Colunas de fenotipo faltando:", paste(missing_pheno, collapse=", ")))

required_ped <- c("a", "s", "d")
missing_ped  <- setdiff(required_ped, names(df_ped))
if (length(missing_ped) > 0) stop(paste("Colunas de pedigree faltando:", paste(missing_ped, collapse=", ")))

# 3. Processamento de Pedigree
pedX <- df_ped %>%
  transmute(
    a = suppressWarnings(as.integer(a)),
    s = suppressWarnings(as.integer(ifelse(s == "" | is.na(s), NA, s))),
    d = suppressWarnings(as.integer(ifelse(d == "" | is.na(d), NA, d)))
  ) %>%
  arrange(a)

if (any(duplicated(pedX$a))) stop("IDs de animais duplicados no pedigree.")

animal_order <- as.character(pedX$a)
pedig <- pedigree(sire = pedX$s, dam = pedX$d, label = pedX$a)
Ainv  <- as.matrix(getAInv(pedig))

# 4. Processamento de Fenótipo
data_obs <- df_pheno %>%
  filter(!is.na(wwg)) %>%
  mutate(
    a = factor(a, levels = animal_order),
    sex = factor(sex)
  )

if ("Male" %in% levels(data_obs$sex)) {
  data_obs$sex <- relevel(data_obs$sex, ref = "Male")
}

# 5. Parâmetros Biológicos (Variance Components)
varA <- 4
varE <- 6
alpha <- varE / varA

# 6. Construção das Matrizes MME
X <- model.matrix(~ -1 + sex, data = data_obs)
Z <- model.matrix(~ a - 1, data = data_obs)
y <- matrix(data_obs$wwg, ncol=1)

XtX <- t(X) %*% X
XtZ <- t(X) %*% Z
ZtX <- t(Z) %*% X
ZtZ <- t(Z) %*% Z

LHS <- rbind(cbind(XtX, XtZ),
             cbind(ZtX, ZtZ + alpha * Ainv))
RHS <- rbind(t(X) %*% y,
             t(Z) %*% y)

# 7. Resolução do Sistema
sol <- solve(LHS, RHS)
CM  <- solve(LHS) # Matriz de Coeficientes para SEP

nFix <- ncol(X)
bHat <- sol[1:nFix, , drop=FALSE]
aHat <- sol[(nFix+1):nrow(sol), , drop=FALSE]

# 8. Cálculo de Acurácia (SEP)
diagCM <- diag(CM[(nFix+1):nrow(CM), (nFix+1):ncol(CM)])
r2 <- 1 - diagCM * alpha
diagCM_clamped <- pmax(diagCM, 0)
SEP <- sqrt(diagCM_clamped * varE)

# 9. Exportação de Resultados
solutions <- tibble(
  animal_id = colnames(Z),
  ebv = as.numeric(aHat)
)

accuracy <- tibble(
  animal_id = colnames(Z),
  accuracy = as.numeric(sqrt(pmax(r2, 0))),
  sep = as.numeric(SEP)
)

write.csv2(solutions, file = file.path(out_dir, "solutions.csv"), row.names = FALSE)
write.csv2(accuracy, file = file.path(out_dir, "accuracy.csv"), row.names = FALSE)

# 10. Log de Auditoria
writeLines(capture.output({
  cat("Stemma MME Engine Success\n")
  cat("Animals:", length(animal_order), "\n")
  cat("Observations:", nrow(data_obs), "\n")
  cat("Alpha (λ):", alpha, "\n")
}), con = file.path(out_dir, "run.log"))
