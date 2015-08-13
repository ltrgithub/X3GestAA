using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.Data.Json;
using Windows.Data.Xml.Dom;
using Windows.Foundation.Metadata;
using Windows.UI.Notifications;

/// <summary>
/// 
/// </summary>
namespace SageX3WUP.NativeAddons
{
    /// <summary>
    /// 
    /// </summary>
    [AllowForWeb]
    public sealed class NativeMessages
    {

        /// <summary>
        /// 
        /// </summary>
        /// <param name="msgJson"></param>
        public void ToastMsg(string msgJson)
        {
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
        }

        /// <summary>
        /// 
        /// </summary>
        public void UpdateTile()
        {
            XmlDocument tileXml = TileUpdateManager.GetTemplateContent(TileTemplateType.TileSquare310x310ImageAndText01);
            XmlNodeList tileTextAttributes = tileXml.GetElementsByTagName("text");
            tileTextAttributes[0].AppendChild(tileXml.CreateTextNode("Hello World!"));
            TileNotification tileNotification = new TileNotification(tileXml);
            TileUpdateManager.CreateTileUpdaterForApplication().Update(tileNotification);
        }
    }
}
