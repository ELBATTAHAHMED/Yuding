package com.ahmed.userservice.models;

@SuppressWarnings("serial")
public class ResourceNotFoundException extends Exception{
  public ResourceNotFoundException(String message ) {
    super(message);
  }

}
