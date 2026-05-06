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
Name: "desktopicon"; Description: "Create a &Desktop shortcut"; GroupDescription: "Additional icons:"; Flags: checked

[Files]
; Application files from build-windows.ps1 output
Source: "{#SrcDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Dirs]
; Ensure data directories are created (writable by the user)
Name: "{app}\data"
Name: "{app}\data\uploads"

[Icons]
; Start Menu shortcut
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\python\python.exe"
; Desktop shortcut (if task selected)
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\python\python.exe"; Tasks: desktopicon
; Stop shortcut in Start Menu
Name: "{group}\Stop {#AppName}"; Filename: "{app}\stop.bat"; WorkingDir: "{app}"
; Uninstaller in Start Menu
Name: "{group}\Uninstall {#AppName}"; Filename: "{uninstallexe}"

[Registry]
; Store a random JWT secret key in the registry on first install
Root: HKCU; Subkey: "Software\SLMC-OMR"; ValueType: string; ValueName: "JwtSecret"; ValueData: "{#SetupSetting("AppId")}-{code:GetRandomSuffix}"; Flags: createvalueifdoesntexist

[Run]
; Launch the application after install
Filename: "{app}\{#AppExeName}"; Description: "Launch {#AppName}"; Flags: nowait postinstall skipifsilent shellexec

[UninstallRun]
; Stop the server before uninstalling
Filename: "{app}\stop.bat"; Flags: shellexec waituntilterminated

[Code]
// Generate a random suffix for the JWT secret key
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

// Write the JWT secret from registry into launch.bat before launch
procedure CurStepChanged(CurStep: TSetupStep);
var
  secret: string;
  launchFile: string;
  content: TStringList;
  i: Integer;
  line: string;
begin
  if CurStep = ssPostInstall then
  begin
    if not RegQueryStringValue(HKCU, 'Software\SLMC-OMR', 'JwtSecret', secret) then
      secret := 'default-change-me-' + GetRandomSuffix('');

    launchFile := ExpandConstant('{app}\launch.bat');
    content := TStringList.Create;
    try
      content.LoadFromFile(launchFile);
      for i := 0 to content.Count - 1 do
      begin
        line := content[i];
        if Pos('set JWT_SECRET_KEY=', line) > 0 then
          content[i] := 'set JWT_SECRET_KEY=' + secret;
      end;
      content.SaveToFile(launchFile);
    finally
      content.Free;
    end;
  end;
end;
