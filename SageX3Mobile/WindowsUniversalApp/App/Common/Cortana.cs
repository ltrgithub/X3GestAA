using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.ApplicationModel.Activation;

namespace Sage.X3.Mobile.App.Common
{
    public class Cortana
    {

        public static async Task RegisterCommands()
        {
            var storageFile = await Windows.Storage.StorageFile.GetFileFromApplicationUriAsync(new Uri("ms-appx:///Resources/VoiceCommands.xml"));
            await Windows.ApplicationModel.VoiceCommands.VoiceCommandDefinitionManager.InstallCommandDefinitionsFromStorageFileAsync(storageFile);
        }

        internal static void HandleCommand(VoiceCommandActivatedEventArgs commandArgs)
        {
            Windows.Media.SpeechRecognition.SpeechRecognitionResult speechRecognitionResult = commandArgs.Result;
            string voiceCommandName = speechRecognitionResult.RulePath[0];
            string textSpoken = speechRecognitionResult.Text;


            // The commandMode is either "voice" or "text", and it indicates how the voice command was entered by the user.
            // Apps should respect "text" mode by providing feedback in a silent form.
            /*
            string commandMode = this.SemanticInterpretation("commandMode", speechRecognitionResult);

            switch (voiceCommandName)
            {
                case "showTripToDestination":
                    // Access the value of the {destination} phrase in the voice command
                    string destination = speechRecognitionResult.SemanticInterpretation.Properties["destination"][0];
                    // Create a navigation parameter string to pass to the page
                    navigationParameterString = string.Format("{0}|{1}|{2}|{3}",
                                    voiceCommandName, commandMode, textSpoken, destination);
                    // Set the page where to navigate for this voice command
                    navigateToPageType = typeof(TripPage);
                    break;

                default:
                    // There is no match for the voice command name. Navigate to MainPage
                    navigateToPageType = typeof(MainPage);
                    break;
            }
            */
        }
    }
}
