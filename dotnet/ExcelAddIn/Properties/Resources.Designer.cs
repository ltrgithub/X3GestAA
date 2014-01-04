﻿//------------------------------------------------------------------------------
// <auto-generated>
//     This code was generated by a tool.
//     Runtime Version:4.0.30319.17929
//
//     Changes to this file may cause incorrect behavior and will be lost if
//     the code is regenerated.
// </auto-generated>
//------------------------------------------------------------------------------

namespace ExcelAddIn.Properties {
    using System;
    
    
    /// <summary>
    ///   A strongly-typed resource class, for looking up localized strings, etc.
    /// </summary>
    // This class was auto-generated by the StronglyTypedResourceBuilder
    // class via a tool like ResGen or Visual Studio.
    // To add or remove a member, edit your .ResX file then rerun ResGen
    // with the /str option, or rebuild your VS project.
    [global::System.CodeDom.Compiler.GeneratedCodeAttribute("System.Resources.Tools.StronglyTypedResourceBuilder", "4.0.0.0")]
    [global::System.Diagnostics.DebuggerNonUserCodeAttribute()]
    [global::System.Runtime.CompilerServices.CompilerGeneratedAttribute()]
    internal class Resources {
        
        private static global::System.Resources.ResourceManager resourceMan;
        
        private static global::System.Globalization.CultureInfo resourceCulture;
        
        [global::System.Diagnostics.CodeAnalysis.SuppressMessageAttribute("Microsoft.Performance", "CA1811:AvoidUncalledPrivateCode")]
        internal Resources() {
        }
        
        /// <summary>
        ///   Returns the cached ResourceManager instance used by this class.
        /// </summary>
        [global::System.ComponentModel.EditorBrowsableAttribute(global::System.ComponentModel.EditorBrowsableState.Advanced)]
        internal static global::System.Resources.ResourceManager ResourceManager {
            get {
                if (object.ReferenceEquals(resourceMan, null)) {
                    global::System.Resources.ResourceManager temp = new global::System.Resources.ResourceManager("ExcelAddIn.Properties.Resources", typeof(Resources).Assembly);
                    resourceMan = temp;
                }
                return resourceMan;
            }
        }
        
        /// <summary>
        ///   Overrides the current thread's CurrentUICulture property for all
        ///   resource lookups using this strongly typed resource class.
        /// </summary>
        [global::System.ComponentModel.EditorBrowsableAttribute(global::System.ComponentModel.EditorBrowsableState.Advanced)]
        internal static global::System.Globalization.CultureInfo Culture {
            get {
                return resourceCulture;
            }
            set {
                resourceCulture = value;
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to Sage X3 for Office.
        /// </summary>
        internal static string AddinTitle {
            get {
                return ResourceManager.GetString("AddinTitle", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized resource of type System.Drawing.Bitmap.
        /// </summary>
        internal static System.Drawing.Bitmap connect {
            get {
                object obj = ResourceManager.GetObject("connect", resourceCulture);
                return ((System.Drawing.Bitmap)(obj));
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to Cannot create a table with {0} columns and {1} rows. Please check your insert preferences.{3}(Error was: &quot;{2}&quot;).
        /// </summary>
        internal static string CreateTableError {
            get {
                return ResourceManager.GetString("CreateTableError", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to Cannot shift up {0} columns and {1} rows. The range value are cleared.{3}(Error was: &quot;{2}&quot;).
        /// </summary>
        internal static string DeleteCellsError {
            get {
                return ResourceManager.GetString("DeleteCellsError", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to Cannot shift down {0} columns and {1} rows, the range might overlap another table. Please check your insert preferences.{3}(Error was: &quot;{2}&quot;).
        /// </summary>
        internal static string InsertCellsError {
            get {
                return ResourceManager.GetString("InsertCellsError", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to Cannot insert {0} rows, the range might overlap another table. Please check your insert preferences.{2}(Error was: &quot;{1}&quot;).
        /// </summary>
        internal static string InsertRowsError {
            get {
                return ResourceManager.GetString("InsertRowsError", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to The document has not been published yet, it will be published as new document..
        /// </summary>
        internal static string MSG_DOC_NOT_PUBLISHED {
            get {
                return ResourceManager.GetString("MSG_DOC_NOT_PUBLISHED", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to Not published yet.
        /// </summary>
        internal static string MSG_DOC_NOT_PUBLISHED_TITLE {
            get {
                return ResourceManager.GetString("MSG_DOC_NOT_PUBLISHED_TITLE", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to Downloading the document failed. 
        ///{0}
        ///URL was: {1}.
        /// </summary>
        internal static string MSG_ERROR_DOWNLOAD {
            get {
                return ResourceManager.GetString("MSG_ERROR_DOWNLOAD", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to Unable to access document..
        /// </summary>
        internal static string MSG_ERROR_NO_DOC {
            get {
                return ResourceManager.GetString("MSG_ERROR_NO_DOC", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to Error.
        /// </summary>
        internal static string MSG_ERROR_TITLE {
            get {
                return ResourceManager.GetString("MSG_ERROR_TITLE", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to New Addin available. Do do want to install it?.
        /// </summary>
        internal static string MSG_NEW_VERSION {
            get {
                return ResourceManager.GetString("MSG_NEW_VERSION", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to Install new version?.
        /// </summary>
        internal static string MSG_NEW_VERSION_TITLE {
            get {
                return ResourceManager.GetString("MSG_NEW_VERSION_TITLE", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to Please restart your Excel after the installation of the new Addin..
        /// </summary>
        internal static string MSG_RESTART {
            get {
                return ResourceManager.GetString("MSG_RESTART", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to Restart Excel.
        /// </summary>
        internal static string MSG_RESTART_TITLE {
            get {
                return ResourceManager.GetString("MSG_RESTART_TITLE", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to This workbook is published on X3, it will be saved on X3. If You want to save a copy of it, please use &quot;Save as&quot; feature. 
        ///Do You want to proceed with Save?.
        /// </summary>
        internal static string MSG_SAVE_AS {
            get {
                return ResourceManager.GetString("MSG_SAVE_AS", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to Save workbook.
        /// </summary>
        internal static string MSG_SAVE_AS_TITLE {
            get {
                return ResourceManager.GetString("MSG_SAVE_AS_TITLE", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to The document has been saved successfully!.
        /// </summary>
        internal static string MSG_SAVE_DOC_DONE {
            get {
                return ResourceManager.GetString("MSG_SAVE_DOC_DONE", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to Saved document.
        /// </summary>
        internal static string MSG_SAVE_DOC_DONE_TITLE {
            get {
                return ResourceManager.GetString("MSG_SAVE_DOC_DONE_TITLE", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to The reference &quot;{0}&quot; is allready associated with table &quot;{1}&quot;. Do You want to delete table &quot;{1}&quot; and replace its content ?.
        /// </summary>
        internal static string OverrideTableConfirm {
            get {
                return ResourceManager.GetString("OverrideTableConfirm", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized resource of type System.Drawing.Bitmap.
        /// </summary>
        internal static System.Drawing.Bitmap preview {
            get {
                object obj = ResourceManager.GetObject("preview", resourceCulture);
                return ((System.Drawing.Bitmap)(obj));
            }
        }
        
        /// <summary>
        ///   Looks up a localized resource of type System.Drawing.Bitmap.
        /// </summary>
        internal static System.Drawing.Bitmap refresh {
            get {
                object obj = ResourceManager.GetObject("refresh", resourceCulture);
                return ((System.Drawing.Bitmap)(obj));
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to Cannot resize a table with {0} columns and {1} rows. Please check Your insert preferences.
        ///(Error was: &quot;{2}&quot;).
        /// </summary>
        internal static string ResizeTableError {
            get {
                return ResourceManager.GetString("ResizeTableError", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized resource of type System.Drawing.Bitmap.
        /// </summary>
        internal static System.Drawing.Bitmap s_aw_light_boolean {
            get {
                object obj = ResourceManager.GetObject("s_aw_light_boolean", resourceCulture);
                return ((System.Drawing.Bitmap)(obj));
            }
        }
        
        /// <summary>
        ///   Looks up a localized resource of type System.Drawing.Bitmap.
        /// </summary>
        internal static System.Drawing.Bitmap s_aw_light_choice {
            get {
                object obj = ResourceManager.GetObject("s_aw_light_choice", resourceCulture);
                return ((System.Drawing.Bitmap)(obj));
            }
        }
        
        /// <summary>
        ///   Looks up a localized resource of type System.Drawing.Bitmap.
        /// </summary>
        internal static System.Drawing.Bitmap s_aw_light_collection {
            get {
                object obj = ResourceManager.GetObject("s_aw_light_collection", resourceCulture);
                return ((System.Drawing.Bitmap)(obj));
            }
        }
        
        /// <summary>
        ///   Looks up a localized resource of type System.Drawing.Bitmap.
        /// </summary>
        internal static System.Drawing.Bitmap s_aw_light_date {
            get {
                object obj = ResourceManager.GetObject("s_aw_light_date", resourceCulture);
                return ((System.Drawing.Bitmap)(obj));
            }
        }
        
        /// <summary>
        ///   Looks up a localized resource of type System.Drawing.Bitmap.
        /// </summary>
        internal static System.Drawing.Bitmap s_aw_light_datetime {
            get {
                object obj = ResourceManager.GetObject("s_aw_light_datetime", resourceCulture);
                return ((System.Drawing.Bitmap)(obj));
            }
        }
        
        /// <summary>
        ///   Looks up a localized resource of type System.Drawing.Bitmap.
        /// </summary>
        internal static System.Drawing.Bitmap s_aw_light_decimale {
            get {
                object obj = ResourceManager.GetObject("s_aw_light_decimale", resourceCulture);
                return ((System.Drawing.Bitmap)(obj));
            }
        }
        
        /// <summary>
        ///   Looks up a localized resource of type System.Drawing.Bitmap.
        /// </summary>
        internal static System.Drawing.Bitmap s_aw_light_graph {
            get {
                object obj = ResourceManager.GetObject("s_aw_light_graph", resourceCulture);
                return ((System.Drawing.Bitmap)(obj));
            }
        }
        
        /// <summary>
        ///   Looks up a localized resource of type System.Drawing.Bitmap.
        /// </summary>
        internal static System.Drawing.Bitmap s_aw_light_image {
            get {
                object obj = ResourceManager.GetObject("s_aw_light_image", resourceCulture);
                return ((System.Drawing.Bitmap)(obj));
            }
        }
        
        /// <summary>
        ///   Looks up a localized resource of type System.Drawing.Bitmap.
        /// </summary>
        internal static System.Drawing.Bitmap s_aw_light_string {
            get {
                object obj = ResourceManager.GetObject("s_aw_light_string", resourceCulture);
                return ((System.Drawing.Bitmap)(obj));
            }
        }
        
        /// <summary>
        ///   Looks up a localized resource of type System.Drawing.Bitmap.
        /// </summary>
        internal static System.Drawing.Bitmap s_aw_light_vignette {
            get {
                object obj = ResourceManager.GetObject("s_aw_light_vignette", resourceCulture);
                return ((System.Drawing.Bitmap)(obj));
            }
        }
        
        /// <summary>
        ///   Looks up a localized resource of type System.Drawing.Bitmap.
        /// </summary>
        internal static System.Drawing.Bitmap sauvegarder {
            get {
                object obj = ResourceManager.GetObject("sauvegarder", resourceCulture);
                return ((System.Drawing.Bitmap)(obj));
            }
        }
        
        /// <summary>
        ///   Looks up a localized resource of type System.Drawing.Bitmap.
        /// </summary>
        internal static System.Drawing.Bitmap sauvegarder2 {
            get {
                object obj = ResourceManager.GetObject("sauvegarder2", resourceCulture);
                return ((System.Drawing.Bitmap)(obj));
            }
        }
        
        /// <summary>
        ///   Looks up a localized resource of type System.Drawing.Bitmap.
        /// </summary>
        internal static System.Drawing.Bitmap save {
            get {
                object obj = ResourceManager.GetObject("save", resourceCulture);
                return ((System.Drawing.Bitmap)(obj));
            }
        }
        
        /// <summary>
        ///   Looks up a localized resource of type System.Drawing.Bitmap.
        /// </summary>
        internal static System.Drawing.Bitmap server_settings {
            get {
                object obj = ResourceManager.GetObject("server_settings", resourceCulture);
                return ((System.Drawing.Bitmap)(obj));
            }
        }
        
        /// <summary>
        ///   Looks up a localized resource of type System.Drawing.Bitmap.
        /// </summary>
        internal static System.Drawing.Bitmap settings {
            get {
                object obj = ResourceManager.GetObject("settings", resourceCulture);
                return ((System.Drawing.Bitmap)(obj));
            }
        }
    }
}
