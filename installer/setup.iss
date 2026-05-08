; ============================================================
;  SLMC OMR System — Inno Setup Installer Script
;
;  Build the dist-windows\ folder first by running:
;    powershell -ExecutionPolicy Bypass -File ..\build-windows.ps1
;
;  Then open this file in Inno Setup and click Build -> Compile.
; ============================================================

#define AppName      "SLMC OMR"
#define AppVersion   "1.0"
#define AppPublisher "Sri Lanka Medical Council"
#define AppURL       "https://github.com/ruwanlinton/slmc-exam-omr"
#define AppExeName   "launch.bat"
#define SrcDir       "..\dist-windows\app"

[Setup]
AppId={{B3A2F1E4-7C8D-4F2A-9E1B-6D5C3A2B1F0E}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}
DefaultDirName={localappdata}\SLMC-OMR
DefaultGroupName={#AppName}
AllowNoIcons=yes
OutputDir=Output
OutputBaseFilename=SLMC-OMR-Setup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesInstallIn64BitMode=x64compatible

; Custom installer graphics (optional — place in installer\ folder)
; WizardImageFile=wizard.bmp
; WizardSmallImageFile=wizard-small.bmp

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &Desktop shortcut"; GroupDescription: "Additional icons:"

[Files]
; Visual C++ Redistributable — required by Python native extensions (numpy, OpenCV, asyncpg, …)
; Extracted to a temp dir and deleted after the installer finishes.
Source: "..\dist-windows\vc_redist.x64.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall

; Application files from build-windows.ps1 output
Source: "{#SrcDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Dirs]
; Ensure data directories are created (writable by the user)
Name: "{app}\data"
Name: "{app}\data\uploads"

[Icons]
; Start Menu shortcuts
Name: "{group}\{#AppName}";          Filename: "{app}\{#AppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\pgsql\bin\postgres.exe"
Name: "{group}\Stop {#AppName}";     Filename: "{app}\stop.bat";      WorkingDir: "{app}"
Name: "{group}\Configure {#AppName}"; Filename: "{app}\configure.bat"; WorkingDir: "{app}"
Name: "{group}\Uninstall {#AppName}"; Filename: "{uninstallexe}"
; Desktop shortcut (if task selected)
Name: "{autodesktop}\{#AppName}";    Filename: "{app}\{#AppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\pgsql\bin\postgres.exe"; Tasks: desktopicon

[Registry]
; Generate a random JWT secret key and DB password on first install; never overwrite on upgrades
Root: HKCU; Subkey: "Software\SLMC-OMR"; ValueType: string; ValueName: "JwtSecret";  ValueData: "{code:GetRandomSuffix|jwt}";  Flags: createvalueifdoesntexist
Root: HKCU; Subkey: "Software\SLMC-OMR"; ValueType: string; ValueName: "PgPassword"; ValueData: "{code:GetRandomSuffix|pg}";   Flags: createvalueifdoesntexist

[Run]
; Install Visual C++ 2015-2022 Redistributable if not already present.
; The installer detects an existing installation and exits quickly without changes.
Filename: "{tmp}\vc_redist.x64.exe"; Parameters: "/install /quiet /norestart"; StatusMsg: "Installing Visual C++ Runtime..."; Flags: waitprogress

; Launch the application after install
Filename: "{app}\{#AppExeName}"; Description: "Launch {#AppName}"; Flags: nowait postinstall skipifsilent shellexec

[UninstallRun]
; Stop the server and database before uninstalling
Filename: "{app}\stop.bat"; Flags: shellexec waituntilterminated

[Code]
// Generate a random 32-character alphanumeric suffix (Param is ignored; present for ValueData macro)
function GetRandomSuffix(Param: string): string;
var
  i: Integer;
  chars: string;
  result_str: string;
begin
  chars := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result_str := '';
  for i := 1 to 32 do
    result_str := result_str + chars[Random(Length(chars)) + 1];
  Result := result_str;
end;

// Inject JWT secret and DB password into config.bat after installation
procedure CurStepChanged(CurStep: TSetupStep);
var
  jwtSecret: string;
  pgPassword: string;
  configFile: string;
  content: TStringList;
  i: Integer;
  line: string;
begin
  if CurStep = ssPostInstall then
  begin
    // Read secrets from registry (written above); fall back to fresh random value
    if not RegQueryStringValue(HKCU, 'Software\SLMC-OMR', 'JwtSecret', jwtSecret) then
      jwtSecret := GetRandomSuffix('');
    if not RegQueryStringValue(HKCU, 'Software\SLMC-OMR', 'PgPassword', pgPassword) then
      pgPassword := GetRandomSuffix('');

    configFile := ExpandConstant('{app}\config.bat');
    content := TStringList.Create;
    try
      content.LoadFromFile(configFile);
      for i := 0 to content.Count - 1 do
      begin
        line := content[i];
        if Pos('set PG_PASSWORD=', line) > 0 then
          content[i] := 'set PG_PASSWORD=' + pgPassword;
        if Pos('set JWT_SECRET_KEY=', line) > 0 then
          content[i] := 'set JWT_SECRET_KEY=' + jwtSecret;
      end;
      content.SaveToFile(configFile);
    finally
      content.Free;
    end;
  end;
end;
