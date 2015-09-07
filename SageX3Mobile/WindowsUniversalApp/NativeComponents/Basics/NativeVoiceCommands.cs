using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.ApplicationModel.Activation;
using Windows.ApplicationModel.VoiceCommands;
using Windows.Data.Json;
using Windows.Data.Xml.Dom;
using Windows.Foundation.Metadata;
using Windows.UI.Notifications;

/// <summary>
/// 
/// </summary>
namespace Sage.X3.Mobile.NativeComponents.Basics
{
    /// <summary>
    /// 
    /// </summary>
    [AllowForWeb]
    public sealed class NativeVoiceCommands
    {
        /// <summary>
        /// Called on app start to register static voice commands which allow to open the app
        /// </summary>
        /// <returns></returns>
        public static void RegisterVoiceCommands(Uri vcd)
        {
            var storageFile = Windows.Storage.StorageFile.GetFileFromApplicationUriAsync(vcd).AsTask().Result;
            Windows.ApplicationModel.VoiceCommands.VoiceCommandDefinitionManager.InstallCommandDefinitionsFromStorageFileAsync(storageFile).AsTask().Wait();
        }

        /// <summary>
        /// {
        ///     command: "show",
        ///     phraseList: ["my customers", "my expenses"],
        ///     phrase: "bookmark"
        /// }
        /// </summary>
        /// <param name="msgJson"></param>
        public void UpdateBookmarks(string msgJson)
        {
            VoiceCommandDefinition commandSetEnUs;

            if (VoiceCommandDefinitionManager.InstalledCommandDefinitions.TryGetValue(
                    "AdventureWorksCommandSet_en-us", out commandSetEnUs))
            {
                commandSetEnUs.SetPhraseListAsync(
                  "destination", new string[] { "test" }).AsTask().Wait();
            }
/*
            JsonObject msgRoot = Windows.Data.Json.JsonValue.Parse(msgJson).GetObject();
            string title = msgRoot.GetNamedString("title");
            string body = msgRoot.GetNamedString("body");
            string severity = msgRoot.GetNamedString("severity");

            // <toast><visual><binding template=\"ToastImageAndText02\"><image id=\"1\" src=\"\"/><text id=\"1\"></text><text id=\"2\"></text></binding></visual></toast>
            ToastTemplateType toastTemplate = ToastTemplateType.ToastImageAndText02;

            XmlDocument toastXml = ToastNotificationManager.GetTemplateContent(toastTemplate);

            XmlNodeList toastTextElements = toastXml.GetElementsByTagName("text");
            toastTextElements[0].AppendChild(toastXml.CreateTextNode(title));
            toastTextElements[1].AppendChild(toastXml.CreateTextNode(body));
            IXmlNode toastNode = toastXml.SelectSingleNode("/toast");
            ((XmlElement)toastNode).SetAttribute("duration", "long");

            ToastNotification toast = new ToastNotification(toastXml);
            ToastNotificationManager.CreateToastNotifier().Show(toast);
*/
        }

        /// <summary>
        /// This will be invoked if the application is activated by a voice command
        /// </summary>
        /// <param name="commandArgs"></param>
        public static void OnActivatedByVoiceCommand(VoiceCommandActivatedEventArgs commandArgs)
        {
            throw new NotImplementedException();
        }
    }
}
