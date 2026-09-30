from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    POSTGRES_DB: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    DATABASE_URL: str

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"

    # M-Pesa (Safaricom Daraja). All optional so the API still starts
    # without them; M-Pesa payments are refused until they are filled in.
    MPESA_ENV: str = "sandbox"  # "sandbox" or "live"
    MPESA_CONSUMER_KEY: str | None = None
    MPESA_CONSUMER_SECRET: str | None = None
    MPESA_SHORTCODE: str | None = None
    MPESA_PASSKEY: str | None = None
    MPESA_CALLBACK_URL: str | None = None

    # Sandbox only: charge this many shillings instead of the order total,
    # because sandbox prompts reach real phones. Ignored when live.
    MPESA_SANDBOX_AMOUNT: int | None = 1

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()